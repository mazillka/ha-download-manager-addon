import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { URLSearchParams } from "url";

/* -------------------- DEFAULTS -------------------- */

export const defaultCookies: Record<string, string> = {
  hdmbbs: "1",
};

export const defaultHeaders: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
};

export const defaultTranslatorsPriority: number[] = [56, 105, 111];
export const defaultTranslatorsNonPriority: number[] = [238];

/* -------------------- Types -------------------- */

export class Type {
  name: string;
  type: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }

  toString(): string {
    return `${this.type}.${this.name}`;
  }

  equals(other: any): boolean {
    if (other instanceof Type) return this.name === other.name;
    if (typeof other === "string") return this.name === other;
    return false;
  }
}

export class Format extends Type {
  constructor(name: string) {
    super(name, "format");
  }
}

export class Category extends Type {
  constructor(name: string) {
    super(name, "category");
  }
}

/* -------------------- Formats -------------------- */

export class TVSeries extends Format {
  constructor() {
    super("tv_series");
  }
}

export class Movie extends Format {
  constructor() {
    super("movie");
  }
}

/* -------------------- Categories -------------------- */

export class Film extends Category {
  constructor() {
    super("film");
  }
}

export class Series extends Category {
  constructor() {
    super("series");
  }
}

export class Cartoon extends Category {
  constructor() {
    super("cartoon");
  }
}

export class Anime extends Category {
  constructor() {
    super("anime");
  }
}

/* -------------------- Ratings -------------------- */

export class Rating {
  value: number;
  votes: number;

  constructor(value: number, votes: number) {
    this.value = value;
    this.votes = votes;
  }

  toString(): string {
    return `${this.value} (${this.votes})`;
  }

  valueOf(): number {
    return this.value;
  }

  gt(other: Rating | number): boolean {
    return this.value > (other instanceof Rating ? other.value : other);
  }

  lt(other: Rating | number): boolean {
    return this.value < (other instanceof Rating ? other.value : other);
  }

  eq(other: Rating | number): boolean {
    return this.value === (other instanceof Rating ? other.value : other);
  }
}

export class EmptyRating extends Rating {
  constructor() {
    super(0, 0);
  }

  toString(): string {
    return "Rating(Empty)";
  }

  valueOf(): number {
    return 0;
  }

  gt(): boolean {
    return false;
  }

  ge(other?: Rating): boolean {
    return other?.value ? false : true;
  }

  le(other?: Rating): boolean {
    return other?.value ? false : true;
  }

  booleanValue(): boolean {
    return false;
  }
}

/* -------------------- Errors -------------------- */

export class LoginRequiredError extends Error {
  constructor() {
    super("Login is required to access this page.");
    this.name = "LoginRequiredError";
  }
}

export class LoginFailed extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "LoginFailed";
  }
}

export class FetchFailed extends Error {
  constructor() {
    super("Failed to fetch stream!");
    this.name = "FetchFailed";
  }
}

export class CaptchaError extends Error {
  constructor() {
    super("Failed to bypass captcha!");
    this.name = "CaptchaError";
  }
}

export class HTTP extends Error {
  code: number;

  constructor(code: number, message = "") {
    super(`${code}: ${message}`);
    this.name = "HTTP";
    this.code = code;
  }
}

/* -------------------- Search Types -------------------- */

export interface SearchItem {
  name: string;
  url: string;
  image?: string;
  rating?: number;
  category?: Category;
  year?: string;
}

export interface SearchOptions {
  origin: string;
  proxy?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

/* -------------------- Search -------------------- */

export class Search {
  origin: string;
  proxy: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;

  constructor(options: SearchOptions) {
    const uri = new URL(options.origin);
    this.origin = `${uri.protocol}//${uri.host}`;
    this.proxy = options.proxy || {};
    this.cookies = options.cookies || {};
    this.headers = options.headers || {};
  }

  async search(
    query: string,
    findAll = false,
  ): Promise<SearchItem[] | SearchResult> {
    return findAll ? this.advancedSearch(query) : this.fastSearch(query);
  }

  async filter(filter: string): Promise<SearchItem[]> {
    const url = `${this.origin}/?filter=${filter}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) throw new HTTP(res.status, res.statusText);

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").text();
    if (title === "Sign In") throw new LoginRequiredError();
    if (title === "Verify") throw new CaptchaError();

    const result: SearchItem[] = [];

    $(".b-content__inline_item").each((_, el) => {
      const item = SearchResult.processItemCheerio($, el);
      if (item) result.push(item);
    });

    return result;
  }

  async fastSearch(query: string): Promise<SearchItem[]> {
    const url = `${this.origin}/engine/ajax/search.php`;
    const body = new URLSearchParams({ q: query });

    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers },
      body,
    });

    if (!res.ok) throw new HTTP(res.status, res.statusText);

    const html = await res.text();
    const $ = cheerio.load(html);

    const results: SearchItem[] = [];

    $(".b-search__section_list li").each((_, el) => {
      const title = $(el).find("span.enty").text().trim();
      const link = $(el).find("a").attr("href");
      const ratingText = $(el).find("span.rating").text();

      if (title && link) {
        results.push({
          name: title,
          url: link,
          rating: ratingText ? parseFloat(ratingText) : undefined,
        });
      }
    });

    return results;
  }

  advancedSearch(query: string): SearchResult {
    return new SearchResult(
      this.origin,
      query,
      this.proxy,
      this.headers,
      this.cookies,
    );
  }
}

/* -------------------- SearchResult -------------------- */

export class SearchResult implements AsyncIterable<SearchItem[]> {
  origin: string;
  query: string;
  proxy?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;

  private _currentPage = 1;
  private _allPagesCache: SearchItem[][] | null = null;

  constructor(
    origin: string,
    query: string,
    proxy?: Record<string, string>,
    headers?: Record<string, string>,
    cookies?: Record<string, string>,
  ) {
    this.origin = origin;
    this.query = query;
    this.proxy = proxy;
    this.headers = headers;
    this.cookies = cookies;
  }

  [Symbol.asyncIterator](): AsyncIterator<SearchItem[]> {
    this._currentPage = 1;
    return {
      next: async (): Promise<IteratorResult<SearchItem[]>> => {
        const page = await this.getPage(this._currentPage);
        if (page.length) {
          this._currentPage++;
          return { value: page, done: false };
        }
        return { value: [], done: true };
      },
    };
  }

  async allPages(): Promise<SearchItem[][]> {
    if (!this._allPagesCache) {
      const pages: SearchItem[][] = [];
      for await (const page of this) {
        if (page.length > 0) pages.push(page);
      }
      this._allPagesCache = pages;
    }
    return this._allPagesCache;
  }

  async all(): Promise<SearchItem[]> {
    const pages = await this.allPages();
    return pages.flat();
  }

  async getPage(page: number): Promise<SearchItem[]> {
    const params = new URLSearchParams({
      do: "search",
      subaction: "search",
      q: this.query,
      page: String(page),
    });

    const url = `${this.origin}/search/?${params.toString()}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) throw new HTTP(res.status, res.statusText);

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").text();
    if (title === "Sign In") throw new LoginRequiredError();
    if (title === "Verify") throw new CaptchaError();

    const result: SearchItem[] = [];

    $(".b-content__inline_item").each((_, el) => {
      const item = SearchResult.processItemCheerio($, el);
      if (item) result.push(item);
    });

    return result;
  }

  static processItemCheerio(
    $: cheerio.CheerioAPI,
    el: cheerio.Element,
  ): SearchItem | null {
    const linkEl = $(el).find(".b-content__inline_item-link a");
    const textDiv = $(el).find(".b-content__inline_item-link div");
    const cover = $(el).find(".b-content__inline_item-cover img");
    const catEl = $(el).find(".cat");

    if (!linkEl.length || !textDiv.length || !cover.length) return null;

    const classes =
      catEl
        .attr("class")
        ?.split(" ")
        .filter((c) => c !== "cat") ?? [];

    const category = classes.length
      ? SearchResult.detectType(classes)
      : undefined;

    const year = SearchResult.parseYearString(textDiv.text());

    return {
      name: linkEl.text().trim(),
      url: linkEl.attr("href")!,
      image: cover.attr("src"),
      category,
      year,
    };
  }

  static detectType(classes: string[]): Category {
    if (classes.includes("films")) return new Film();
    if (classes.includes("series")) return new Series();
    if (classes.includes("cartoons")) return new Cartoon();
    if (classes.includes("animation")) return new Anime();
    return new Category(classes[0]);
  }

  static parseYearString(input: string): string {
    const yearPart = input.split(",")[0].trim();

    const openRange = yearPart.match(/(\d{4})\s*[–-]\s*(\.\.\.)/);
    if (openRange) return `${openRange[1]} – ...`;

    const closedRange = yearPart.match(/(\d{4})\s*[–-]\s*(\d{4})/);
    if (closedRange) return `${closedRange[1]} – ${closedRange[2]}`;

    const singleYear = yearPart.match(/\d{4}/);
    if (singleYear) return singleYear[0];

    return "N/A";
  }
}
