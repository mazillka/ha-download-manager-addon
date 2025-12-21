import { chromium } from "playwright";

const BROWSER_POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE || "4", 10);
const NAV_TIMEOUT = parseInt(process.env.BROWSER_NAV_TIMEOUT || "60000", 10);

let browser = null;
let context = null;
let totalPages = 0;
const availablePages = [];
const pendingAcquires = [];

function shouldBlockRequest(url, resourceType) {
    if (!url)
        return false;
    const blockedHosts = [
        "googlesyndication",
        "google-analytics",
        "doubleclick.net",
        "facebook.net",
        "adsystem",
        "ads.",
        "yandex",
        "vk"
    ];
    try {
        const u = new URL(url);
        const host = u.hostname;
        if (blockedHosts.some(h => host.includes(h))) {
            return true;
        }
    } catch (e) {
        // ignore
    }
    if (["image", "font", "media", "stylesheet", "other"].includes(resourceType)) {
        return true;
    }
    return false;
}

export async function getBrowser() {
    if (!browser) {
        browser = await chromium.launch({
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
                "--disable-gpu"
            ]
        });
        // Graceful shutdown
        const shutdown = async () => {
            try {
                if (browser) {
                    await browser.close();
                }
            } catch (e) { }
            process.exit(0);
        };
        process.once("SIGINT", shutdown);
        process.once("SIGTERM", shutdown);
        process.once("exit", shutdown);
        process.once("uncaughtException", shutdown);
    }
    return browser;
}

export async function getContext() {
    if (!context) {
        const b = await getBrowser();
        context = await b.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
            javaScriptEnabled: true
        });

        // Block unnecessary resources and trackers
        await context.route("**/*", route => {
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

async function createPage() {
    const ctx = await getContext();
    const p = await ctx.newPage();
    p.setDefaultTimeout(NAV_TIMEOUT);
    p.setDefaultNavigationTimeout(NAV_TIMEOUT);
    totalPages += 1;
    return p;
}

function acquireFromPool() {
    if (availablePages.length) {
        return availablePages.pop();
    }
    if (totalPages < BROWSER_POOL_SIZE) {
        return null; // signal to create
    }
    return null; // nothing available
}

export async function acquirePage() {
    // fast path
    const p = acquireFromPool();
    if (p) {
        return p;
    }

    // create new if under limit
    if (totalPages < BROWSER_POOL_SIZE) {
        return await createPage();
    }

    // otherwise wait
    return await new Promise(resolve => pendingAcquires.push(resolve));
}

export function releasePage(p) {
    if (pendingAcquires.length) {
        const r = pendingAcquires.shift();
        return r(p);
    }
    availablePages.push(p);
}

export async function getPage() {
    return acquirePage();
}

export async function parse(url, func, options = {}) {
    // If headers or cookies are provided, or caller requests isolation, create a fresh context
    const needsIsolation = options.headers || options.cookies || options.forceNewContext;
    if (needsIsolation) {
        const b = await getBrowser();
        const tmpContext = await b.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: options.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
            javaScriptEnabled: true,
        });

        // route blocking for the temp context
        await tmpContext.route("**/*", route => {
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
            } catch (e) { }
        }

        // add cookies if provided
        if (options.cookies) {
            try {
                const cookies = [];
                const u = new URL(url);
                const domain = u.hostname;
                if (Array.isArray(options.cookies)) {
                    for (const c of options.cookies) {
                        cookies.push({ name: c.name, value: c.value, domain, path: c.path || '/' });
                    }
                } else if (typeof options.cookies === 'object') {
                    for (const [k, v] of Object.entries(options.cookies)) {
                        cookies.push({ name: k, value: String(v), domain, path: '/' });
                    }
                }
                if (cookies.length) {
                    await tmpContext.addCookies(cookies);
                }
            } catch (e) { }
        }

        const page = await tmpContext.newPage();
        page.setDefaultTimeout(options.timeout || NAV_TIMEOUT);
        page.setDefaultNavigationTimeout(options.timeout || NAV_TIMEOUT);

        try {
            try {
                await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 });
            } catch (e) { }

            const strategies = options.strategies || [options.waitUntil || 'networkidle', 'domcontentloaded'];
            let lastErr = null;
            for (const strat of strategies) {
                try {
                    const gotoOptions = { waitUntil: strat, timeout: options.timeout || NAV_TIMEOUT };
                    await page.goto(url, gotoOptions);

                    if (options.waitForSelector) {
                        await page.waitForSelector(options.waitForSelector, { timeout: options.selectorTimeout || 5000 });
                    }

                    if (options.preEvaluateDelay || options.humanizeDelay) {
                        const base = options.preEvaluateDelay || 0;
                        const human = options.humanizeDelay ? Math.floor(Math.random() * (options.humanizeDelayMax || 800)) : 0;
                        const delay = base + human;
                        if (delay > 0) {
                            await page.waitForTimeout(delay);
                        }
                    }

                    return await page.evaluate(func);
                } catch (err) {
                    lastErr = err;
                }
            }
            throw lastErr;
        } finally {
            try {
                await tmpContext.close();
            } catch (e) { }
        }
    }

    // shared pooled page path
    const page = await acquirePage();
    try {
        // best-effort reset page to reduce leftover state
        try {
            await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 });
        } catch (e) { }

        const strategies = options.strategies || [options.waitUntil || 'networkidle', 'domcontentloaded'];
        let lastErr = null;
        for (const strat of strategies) {
            try {
                const gotoOptions = { waitUntil: strat, timeout: options.timeout || NAV_TIMEOUT };
                await page.goto(url, gotoOptions);

                if (options.waitForSelector) {
                    await page.waitForSelector(options.waitForSelector, { timeout: options.selectorTimeout || 5000 });
                }

                if (options.preEvaluateDelay || options.humanizeDelay) {
                    const base = options.preEvaluateDelay || 0;
                    const human = options.humanizeDelay ? Math.floor(Math.random() * (options.humanizeDelayMax || 800)) : 0;
                    const delay = base + human;
                    if (delay > 0) {
                        await page.waitForTimeout(delay);
                    }
                }

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