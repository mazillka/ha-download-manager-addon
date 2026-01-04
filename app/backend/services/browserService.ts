import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import type { ParseOptions } from "../interfaces/index";

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let totalPages = 0;
const availablePages: Page[] = [];
const pendingAcquires: ((page: Page) => void)[] = [];

function shouldBlockRequest(url: string, resourceType: string): boolean {
  if (!url) {
    return false;
  }
  const blockedHosts = [
    "googlesyndication",
    "google-analytics",
    "doubleclick.net",
    "facebook.net",
    "adsystem",
    "ads.",
    "yandex",
    "vk",
  ];
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (blockedHosts.some((h) => host.includes(h))) {
      return true;
    }
  } catch (e) {
    // ignore
  }
  if (
    ["image", "font", "media", "stylesheet", "other"].includes(resourceType)
  ) {
    return true;
  }
  return false;
}

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    const launchOptions: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-features=site-per-process",
        "--disable-breakpad",
        "--disable-component-update",
        "--disable-gpu",
      ],
    };

    if (process.env.CHROME_BIN) {
      launchOptions.executablePath = process.env.CHROME_BIN;
    }

    browser = await chromium.launch(launchOptions);
    // Graceful shutdown
    const shutdown = async () => {
      try {
        if (browser) {
          await browser.close();
        }
      } catch (e) {}
      process.exit(0);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    process.once("exit", shutdown);
    process.once("uncaughtException", shutdown);
  }
  return browser;
}

export async function getContext(): Promise<BrowserContext> {
  if (!context) {
    const b = await getBrowser();
    context = await b.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      javaScriptEnabled: true,
    });

    // Block unnecessary resources and trackers
    await context.route("**/*", (route) => {
      const req = route.request();
      const type = req.resourceType();
      const url = req.url();
      if (shouldBlockRequest(url, type)) {
        return route.abort();
      }
      return route.continue();
    });
  }
  return context;
}

async function createPage(): Promise<Page> {
  const ctx = await getContext();
  const p = await ctx.newPage();
  const timeout = parseInt(process.env.BROWSER_NAV_TIMEOUT || "60000", 10);
  p.setDefaultTimeout(timeout);
  p.setDefaultNavigationTimeout(timeout);
  totalPages += 1;
  return p;
}

function acquireFromPool(): Page | null {
  if (availablePages.length) {
    return availablePages.pop() || null;
  }
  const poolSize = parseInt(process.env.BROWSER_POOL_SIZE || "4", 10);
  if (totalPages < poolSize) {
    return null; // signal to create
  }
  return null; // nothing available
}

export async function acquirePage(): Promise<Page> {
  // fast path
  const p = acquireFromPool();
  if (p) {
    return p;
  }

  // create new if under limit
  const poolSize = parseInt(process.env.BROWSER_POOL_SIZE || "4", 10);
  if (totalPages < poolSize) {
    return await createPage();
  }

  // otherwise wait
  return await new Promise<Page>((resolve) => pendingAcquires.push(resolve));
}

export function releasePage(p: Page): void {
  if (pendingAcquires.length) {
    const r = pendingAcquires.shift();
    if (r) {
      r(p);
    }
    return;
  }
  availablePages.push(p);
}

export async function getPage(): Promise<Page> {
  return acquirePage();
}

export async function parse<T>(
  url: string,
  func: (arg: any) => T | Promise<T>,
  options: ParseOptions = {}
): Promise<T> {
  // If headers or cookies are provided, or caller requests isolation, create a fresh context
  const needsIsolation =
    options.headers || options.cookies || options.forceNewContext;
  if (needsIsolation) {
    const b = await getBrowser();
    const tmpContext = await b.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        options.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
      javaScriptEnabled: true,
    });

    // route blocking for the temp context
    await tmpContext.route("**/*", (route) => {
      const req = route.request();
      const type = req.resourceType();
      const url1 = req.url();
      if (shouldBlockRequest(url1, type)) {
        return route.abort();
      }
      return route.continue();
    });

    // set headers if provided
    if (options.headers) {
      try {
        await tmpContext.setExtraHTTPHeaders(options.headers);
      } catch (e) {}
    }

    // add cookies if provided
    if (options.cookies) {
      try {
        const cookies: any[] = [];
        const u = new URL(url);
        const domain = u.hostname;
        if (Array.isArray(options.cookies)) {
          for (const c of options.cookies) {
            cookies.push({
              name: c.name,
              value: c.value,
              domain,
              path: c.path || "/",
            });
          }
        } else if (typeof options.cookies === "object") {
          for (const [k, v] of Object.entries(options.cookies)) {
            cookies.push({ name: k, value: String(v), domain, path: "/" });
          }
        }
        if (cookies.length) {
          await tmpContext.addCookies(cookies);
        }
      } catch (e) {}
    }

    const page = await tmpContext.newPage();
    const timeout = parseInt(process.env.BROWSER_NAV_TIMEOUT || "60000", 10);
    page.setDefaultTimeout(options.timeout || timeout);
    page.setDefaultNavigationTimeout(options.timeout || timeout);

    try {
      try {
        await page.goto("about:blank", {
          waitUntil: "domcontentloaded",
          timeout: 5000,
        });
      } catch (e) {}

      const strategies = options.strategies || [
        options.waitUntil || "networkidle",
        "domcontentloaded",
      ];
      let lastErr: any = null;
      for (const strat of strategies) {
        try {
          const gotoOptions = {
            waitUntil: strat,
            timeout: options.timeout || timeout,
          };
          await page.goto(url, gotoOptions);

          if (options.waitForSelector) {
            await page.waitForSelector(options.waitForSelector, {
              timeout: options.selectorTimeout || 5000,
            });
          }

          if (options.preEvaluateDelay || options.humanizeDelay) {
            const base = options.preEvaluateDelay || 0;
            const human = options.humanizeDelay
              ? Math.floor(Math.random() * (options.humanizeDelayMax || 800))
              : 0;
            const delay = base + human;
            if (delay > 0) {
              await page.waitForTimeout(delay);
            }
          }

          SubscribeForLogs(page);

          return await page.evaluate(func, options.evalArg);
        } catch (err) {
          lastErr = err;
        }
      }

      throw lastErr;
    } finally {
      try {
        await tmpContext.close();
      } catch (e) {}
    }
  }

  // shared pooled page path
  const page = await acquirePage();
  const timeout = parseInt(process.env.BROWSER_NAV_TIMEOUT || "60000", 10);
  try {
    // best-effort reset page to reduce leftover state
    try {
      await page.goto("about:blank", {
        waitUntil: "domcontentloaded",
        timeout: 5000,
      });
    } catch (e) {}

    const strategies = options.strategies || [
      options.waitUntil || "networkidle",
      "domcontentloaded",
    ];
    let lastErr: any = null;
    for (const strat of strategies) {
      try {
        const gotoOptions = {
          waitUntil: strat,
          timeout: options.timeout || timeout,
        };
        await page.goto(url, gotoOptions);

        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, {
            timeout: options.selectorTimeout || 5000,
          });
        }

        if (options.preEvaluateDelay || options.humanizeDelay) {
          const base = options.preEvaluateDelay || 0;
          const human = options.humanizeDelay
            ? Math.floor(Math.random() * (options.humanizeDelayMax || 800))
            : 0;
          const delay = base + human;
          if (delay > 0) {
            await page.waitForTimeout(delay);
          }
        }

        SubscribeForLogs(page);

        return await page.evaluate(func, options.evalArg);
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr;
  } finally {
    releasePage(page);
  }
}

function SubscribeForLogs(page: Page) {
  page.on("console", (msg) => {
    if (msg.type() === "log") {
      console.log(`[${new Date().toLocaleString()}] - console: ${msg.text()}`);
    }

    if (msg.type() === "error") {
      if (msg.text().includes("Failed to load resource: net::")) {
        return;
      }

      console.log(" - - - - - - - - - - - - - - ");
      console.error(
        `[${new Date().toLocaleString()}] - console error: ${msg.text()}`
      );
      console.log(" - - - - - - - - - - - - - - ");
    }
  });

  page.on("pageerror", (error) => {
    if (error.message.includes("Failed to fetch")) {
      return;
    }

    console.log(" - - - - - - - - - - - - - - ");
    console.error(
      `[${new Date().toLocaleString()}] - exception name: ${error.name}`
    );
    console.error(
      `[${new Date().toLocaleString()}] - exception message: ${error.message}`
    );
    console.error(
      `[${new Date().toLocaleString()}] - exception stack: ${error.stack}`
    );
    console.log(" - - - - - - - - - - - - - - ");
  });
}

export default {
  getBrowser,
  getContext,
  acquirePage,
  releasePage,
  getPage,
  parse,
};
