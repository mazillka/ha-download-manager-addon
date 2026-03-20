import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { URL, URLSearchParams } from "url";
import fetch from "node-fetch";

// --- Default Configuration ---

export const defaultCookies: Record<string, string> = {
  hdmbbs: "1",
};

export const defaultHeaders: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36",
};

export const defaultTranslatorsPriority: number[] = [56, 105, 111];
export const defaultTranslatorsNonPriority: number[] = [238];

// --- Error Classes ---

export class CustomError extends Error {}

export class LoginRequiredError extends CustomError {
  constructor() {
    super("Login is required to access this page.");
    this.name = "LoginRequiredError";
  }
}

export class LoginFailed extends CustomError {
  constructor(msg: string) {
    super(msg);
    this.name = "LoginFailed";
  }
}

export class FetchFailed extends CustomError {
  constructor() {
    super("Failed to fetch stream!");
    this.name = "FetchFailed";
  }
}

export class CaptchaError extends CustomError {
  constructor() {
    super("Failed to bypass captcha!");
    this.name = "CaptchaError";
  }
}

export class HTTPError extends CustomError {
  constructor(
    public code: number,
    public reason: string,
  ) {
    super(`${code} ${reason}`);
    this.name = "HTTPError";
  }
}

// --- Type Classes ---

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

// --- Content Type Classes ---

export class ContentType {
  isMovie() {
    return this instanceof Movie;
  }

  isTVSeries() {
    return this instanceof TVSeries;
  }

  isFormat() {
    return this instanceof Format;
  }
}

export class TVSeries extends ContentType {}

export class Movie extends ContentType {}

export class Format extends ContentType {
  constructor(public name: string) {
    super();
  }
}

// --- Category Type Classes ---

export class CategoryType {
  toJSON(): { name: string } {
    return { name: this.constructor.name };
  }
}

export class Film extends CategoryType {
  toJSON() {
    return { name: "Film" };
  }
}

export class Series extends CategoryType {
  toJSON() {
    return { name: "Series" };
  }
}

export class Cartoon extends CategoryType {
  toJSON() {
    return { name: "Cartoon" };
  }
}

export class Anime extends CategoryType {
  toJSON() {
    return { name: "Anime" };
  }
}

export class Category extends CategoryType {
  constructor(public name: string) {
    super();
  }

  toJSON() {
    return { name: this.name };
  }
}

// --- Rating Classes ---

export interface Rating {
  value: number;
  votes: number;
}

export class RatingClass {
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

  gt(other: RatingClass | number): boolean {
    return this.value > (other instanceof RatingClass ? other.value : other);
  }

  lt(other: RatingClass | number): boolean {
    return this.value < (other instanceof RatingClass ? other.value : other);
  }

  eq(other: RatingClass | number): boolean {
    return this.value === (other instanceof RatingClass ? other.value : other);
  }
}

export class EmptyRating extends RatingClass {
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

  ge(other?: RatingClass): boolean {
    return other?.value ? false : true;
  }

  le(other?: RatingClass): boolean {
    return other?.value ? false : true;
  }

  booleanValue(): boolean {
    return false;
  }
}

// --- Stream Class ---

export class Stream {
  videos: { quality: string; url: string }[] = [];

  constructor(
    public season: number | null,
    public episode: number | null,
    public name: string,
    public translator_id: number,
    public subtitles: any,
  ) {}

  append(quality: string, url: string) {
    this.videos.push({ quality, url });
  }
}

// --- Search Interfaces ---

export interface SearchItem {
  name: string;
  url: string;
  image?: string;
  rating?: number;
  category?: CategoryType;
  year?: string;
}

export interface SearchOptions {
  origin: string;
  proxy?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

// --- SearchResult Helper Class ---

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

    if (!res.ok) throw new HTTPError(res.status, res.statusText);

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
    el: Element,
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

  static detectType(classes: string[]): CategoryType {
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

// --- Main Streaming API Class ---

export class StreamingAPI {
  origin: string;
  proxy: any;
  customHeaders: Record<string, string>;
  private _cookies: Record<string, string>;
  private _translators_priority: number[];
  private _translators_non_priority: number[];
  private _cookieHeaderCache: string | null = null;

  // Details-specific properties
  private _currentUrl: string | null = null;
  private _page: AxiosResponse | null = null;
  private _soup: cheerio.CheerioAPI | null = null;
  private _id: number | null = null;
  private _names: string[] | null = null;
  private _origNames: string[] | null = null;
  private _description: string | null = null;
  private _thumbnail: string | null = null;
  private _thumbnailHQ: string | null = null;
  private _releaseYear: string | null = null;
  private _type: ContentType | null = null;
  private _category: CategoryType | null = null;
  private _rating: Rating | null = null;
  private _translators: Record<
    number,
    { name: string; premium: boolean }
  > | null = null;
  private _seriesInfo: Record<number, any> | null = null;
  private _episodesInfo: any[] | null = null;

  constructor(options: {
    origin: string;
    proxy?: any;
    customHeaders?: Record<string, string>;
    cookies?: Record<string, string>;
    translators_priority?: number[];
    translators_non_priority?: number[];
  }) {
    const uri = new URL(options.origin);
    this.origin = `${uri.protocol}//${uri.host}`;
    this.proxy = options.proxy || {};
    this._cookies = { ...defaultCookies, ...(options.cookies || {}) };
    this.customHeaders = {
      ...defaultHeaders,
      ...(options.customHeaders || {}),
    };
    this._translators_priority =
      options.translators_priority || defaultTranslatorsPriority;
    this._translators_non_priority =
      options.translators_non_priority || defaultTranslatorsNonPriority;
  }

  get cookies() {
    return this._cookies;
  }

  set cookies(value: Record<string, string>) {
    this._cookies = value;
    this._cookieHeaderCache = null;
  }

  // --- Configuration Methods ---

  get translators_priority() {
    return this._translators_priority;
  }
  set translators_priority(value: number[]) {
    this._translators_priority = value || [];
  }

  get translators_non_priority() {
    return this._translators_non_priority;
  }
  set translators_non_priority(value: number[]) {
    this._translators_non_priority = value || [];
  }

  // --- Authentication Methods ---

  async login(
    email: string,
    password: string,
    raise_exception = true,
  ): Promise<boolean> {
    const formData = new URLSearchParams();
    formData.append("login_name", email);
    formData.append("login_password", password);

    const response = await axios.post(
      `${this.origin}/ajax/login/`,
      formData.toString(),
      {
        ...this.getAxiosConfig(),
        headers: {
          ...this.customHeaders,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const data = response.data;
    if (data.success) {
      if (response.headers["set-cookie"]) {
        response.headers["set-cookie"].forEach((c) => {
          const [keyVal] = c.split(";");
          const [key, val] = keyVal.split("=");
          this.cookies[key.trim()] = val.trim();
        });
      }
      return true;
    }
    if (raise_exception) throw new LoginFailed(data.message);
    return false;
  }

  static makeCookies(user_id: string, password_hash: string) {
    return { dle_user_id: String(user_id), dle_password: password_hash };
  }

  // --- Search Methods ---

  async search(
    query: string,
    findAll = false,
  ): Promise<SearchItem[] | SearchResult> {
    return findAll ? this.advancedSearch(query) : this.fastSearch(query);
  }

  async filter(filter: string): Promise<SearchItem[]> {
    const url = `${this.origin}/?filter=${filter}`;
    const res = await fetch(url, { headers: this.customHeaders });

    if (!res.ok) throw new HTTPError(res.status, res.statusText);

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
      headers: { ...this.customHeaders },
      body,
    });

    if (!res.ok) throw new HTTPError(res.status, res.statusText);

    const html = await res.text();
    const $ = cheerio.load(html);

    const results: SearchItem[] = [];

    $(".b-search__section_list li").each((_, el) => {
      const title = $(el).find("span.enty").text().trim();
      const link = $(el).find("a").attr("href");
      const ratingText = $(el).find("span.rating").text();

      if (title && link) {
        // Extract category from URL path
        let category: CategoryType | undefined;
        try {
          const urlPath = new URL(link, this.origin).pathname;
          const pathParts = urlPath.replace(/^\//, "").split("/");
          if (pathParts.length > 0) {
            const cat = pathParts[0];
            if (cat === "films") category = new Film();
            else if (cat === "series") category = new Series();
            else if (cat === "cartoons") category = new Cartoon();
            else if (cat === "animation") category = new Anime();
            else if (cat) category = new Category(cat);
          }
        } catch (e) {
          // If URL parsing fails, category remains undefined
        }

        results.push({
          name: title,
          url: link,
          rating: ratingText ? parseFloat(ratingText) : undefined,
          category,
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
      this.customHeaders,
      this.cookies,
    );
  }

  // --- Details Methods ---

  /**
   * Clear all cached data
   */
  private clearCache() {
    Object.assign(this, {
      _page: null,
      _soup: null,
      _id: null,
      _names: null,
      _origNames: null,
      _description: null,
      _thumbnail: null,
      _thumbnailHQ: null,
      _releaseYear: null,
      _type: null,
      _category: null,
      _rating: null,
      _translators: null,
      _seriesInfo: null,
      _episodesInfo: null,
    });
  }

  /**
   * Load a specific URL for details extraction
   */
  loadUrl(url: string): this {
    this._currentUrl = url.split(".html")[0] + ".html";
    this.clearCache();
    return this;
  }

  private ensureUrlLoaded() {
    if (!this._currentUrl) {
      throw new Error(
        "No URL loaded. Call loadUrl(url) before accessing details.",
      );
    }
  }

  async ok(): Promise<boolean> {
    try {
      return !!(await this.getSoup());
    } catch {
      return false;
    }
  }

  private getCookieHeader(): string {
    if (this._cookieHeaderCache) return this._cookieHeaderCache;

    this._cookieHeaderCache = Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    return this._cookieHeaderCache;
  }

  private getAxiosConfig() {
    return {
      headers: { ...this.customHeaders, Cookie: this.getCookieHeader() },
      proxy: Object.keys(this.proxy).length > 0 ? this.proxy : false,
      validateStatus: () => true,
    };
  }

  private async getPage(): Promise<AxiosResponse> {
    this.ensureUrlLoaded();
    if (this._page) return this._page;
    const r = await axios.get(this._currentUrl!, {
      ...this.getAxiosConfig(),
      maxRedirects: 5,
    });

    if (r.status >= 200 && r.status < 300) {
      this._page = r;
      return r;
    }
    throw new HTTPError(r.status, r.statusText);
  }

  private async getSoup(): Promise<cheerio.CheerioAPI> {
    if (this._soup) return this._soup;
    const page = await this.getPage();
    const $ = cheerio.load(page.data);

    const title = $("title").text();
    if (title === "Sign In") throw new LoginRequiredError();
    if (title === "Verify") throw new CaptchaError();

    this._soup = $;
    return $;
  }

  async getId(): Promise<number> {
    if (this._id !== null) return this._id;
    const $ = await this.getSoup();

    let val = $("#post_id").val();
    if (!val) val = $("#send-video-issue").attr("data-id");
    if (!val) val = $("#user-favorites-holder").attr("data-post_id");
    if (!val) val = this._currentUrl!.split("/").pop()?.split("-")[0];

    this._id = val ? parseInt(String(val)) : 0;
    return this._id;
  }

  async getName(): Promise<string> {
    const names = await this.getNames();
    return names[0];
  }

  async getNames(): Promise<string[]> {
    if (this._names) return this._names;
    const $ = await this.getSoup();
    this._names = $(".b-post__title")
      .text()
      .split("/")
      .map((s) => s.trim());
    return this._names;
  }

  async getOrigName(): Promise<string | null> {
    const names = await this.getOrigNames();
    return names.length > 0 ? names[names.length - 1] : null;
  }

  async getOrigNames(): Promise<string[]> {
    if (this._origNames) return this._origNames;
    const $ = await this.getSoup();
    const el = $(".b-post__origtitle");
    if (el.length) {
      this._origNames = el
        .text()
        .split("/")
        .map((s) => s.trim());
    } else {
      this._origNames = [];
    }
    return this._origNames;
  }

  async getDescription(): Promise<string> {
    if (this._description) return this._description;
    const $ = await this.getSoup();
    this._description = $(".b-post__description_text").text().trim();
    return this._description;
  }

  async getThumbnail(): Promise<string | undefined> {
    if (this._thumbnail) return this._thumbnail;
    const $ = await this.getSoup();
    this._thumbnail = $(".b-sidecover img").attr("src") as string;
    return this._thumbnail;
  }

  async getThumbnailHQ(): Promise<string | undefined> {
    if (this._thumbnailHQ) return this._thumbnailHQ;
    const $ = await this.getSoup();
    this._thumbnailHQ = $(".b-sidecover a").attr("href") as string;
    return this._thumbnailHQ;
  }

  async getReleaseYear(): Promise<string> {
    if (this._releaseYear) return this._releaseYear;
    const $ = await this.getSoup();
    const el = $('.b-content__main .b-post__info a[href*="/year/"]');
    if (el.length) {
      const match = el.attr("href")?.match(/\d{4}/);
      if (match) {
        this._releaseYear = match[0];
        return this._releaseYear;
      }
    }
    return "N/A";
  }

  async getType(): Promise<ContentType> {
    if (this._type) return this._type;
    const $ = await this.getSoup();
    const typeStr = $('meta[property="og:type"]').attr("content");

    if (typeStr === "video.tv_series") this._type = new TVSeries();
    else if (typeStr === "video.movie") this._type = new Movie();
    else this._type = new Format(typeStr || "");

    return this._type;
  }

  async getCategory(): Promise<CategoryType> {
    if (this._category) return this._category;
    const uri = new URL(this._currentUrl!);
    const cat = uri.pathname.replace(/^\//, "").split("/")[0];

    if (cat === "films") this._category = new Film();
    else if (cat === "series") this._category = new Series();
    else if (cat === "cartoons") this._category = new Cartoon();
    else if (cat === "animation") this._category = new Anime();
    else this._category = new Category(cat);

    return this._category;
  }

  async getRating(): Promise<Rating | null> {
    if (this._rating !== undefined) return this._rating;

    const $ = await this.getSoup();
    const wrapper = $(".b-post__rating");

    if (!wrapper.length) {
      this._rating = null;
      return null;
    }

    const rating = parseFloat(wrapper.find(".num").text());
    const votes = parseInt(wrapper.find(".votes").text().replace(/[()]/g, ""));
    this._rating = { value: rating, votes };
    return this._rating;
  }

  async getTranslators(): Promise<
    Record<number, { name: string; premium: boolean }>
  > {
    if (this._translators) return this._translators;
    const $ = await this.getSoup();
    const arr: Record<number, { name: string; premium: boolean }> = {};
    const translators = $("#translators-list");

    if (translators.length) {
      translators.children().each((_, child) => {
        const $child = $(child);
        const id = parseInt($child.attr("data-translator_id") || "0");
        let name = $child.text().trim();
        const premium = $child.hasClass("b-prem_translator");
        const img = $child.find("img");

        if (img.length) {
          const lang = img.attr("title");
          if (lang && !name.includes(lang)) {
            name += ` (${lang})`;
          }
        }
        arr[id] = { name, premium };
      });
    }

    if (Object.keys(arr).length === 0) {
      const getTranslationName = ($doc: cheerio.CheerioAPI) => {
        const table = $doc(".b-post__info");
        let foundName = "";
        table.find("tr").each((_, tr) => {
          const text = $(tr).text();
          if (text.includes("переводе")) {
            foundName = text.split("В переводе:").pop()?.trim() || "";
          }
        });
        return foundName;
      };

      const getTranslationID = async ($doc: cheerio.CheerioAPI) => {
        const type = await this.getType();
        const initCDNEvents: Record<string, string> = {
          "video.tv_series": "initCDNSeriesEvents",
          "video.movie": "initCDNMoviesEvents",
        };
        const typeKey =
          type instanceof TVSeries ? "video.tv_series" : "video.movie";
        const scriptText = $doc.text();
        const eventName = initCDNEvents[typeKey];

        if (eventName) {
          const parts = scriptText.split(`sof.tv.${eventName}`);
          if (parts.length > 1) {
            const tmp = parts[1].split("{")[0];
            return parseInt(tmp.split(",")[1].trim());
          }
        }
        return 0;
      };

      const id = await getTranslationID($);
      arr[id] = { name: getTranslationName($), premium: false };
    }

    this._translators = arr;
    return arr;
  }

  async sortTranslators(
    translators?: Record<number, any>,
    priority?: number[],
    non_priority?: number[],
  ) {
    const currentTranslators = translators || (await this.getTranslators());
    const pList = priority || this._translators_priority || [];
    const npList = non_priority || this._translators_non_priority || [];

    // Create priority map once for O(1) lookups
    const priorityMap = new Map<number, number>();
    pList.forEach((id, idx) => priorityMap.set(id, idx + 1));

    const maxPriority = pList.length + 1;
    npList.forEach((id, idx) => {
      if (!priorityMap.has(id)) {
        priorityMap.set(id, maxPriority + idx + 1);
      }
    });

    // Sort entries directly
    const sorted = Object.entries(currentTranslators).sort((a, b) => {
      const rankA = priorityMap.get(parseInt(a[0])) || maxPriority;
      const rankB = priorityMap.get(parseInt(b[0])) || maxPriority;
      return rankA - rankB;
    });

    return Object.fromEntries(sorted);
  }

  private static trashCodesCache: string[] | null = null;

  private static getTrashCodes(): string[] {
    if (this.trashCodesCache) return this.trashCodesCache;

    const trashList = ["@", "#", "!", "^", "$"];
    const trashCodesSet: string[] = [];

    const getCombinations = (chars: string[], length: number) => {
      const result: string[] = [];
      const f = (prefix: string, chars: string[]) => {
        for (let i = 0; i < chars.length; i++) {
          const newPrefix = prefix + chars[i];
          if (newPrefix.length === length) result.push(newPrefix);
          else f(newPrefix, chars);
        }
      };
      f("", chars);
      return result;
    };

    for (let i = 2; i < 4; i++) {
      const combos = getCombinations(trashList, i);
      for (const combo of combos) {
        const buff = Buffer.from(combo);
        const trashcombo = buff.toString("base64");
        trashCodesSet.push(trashcombo);
      }
    }

    this.trashCodesCache = trashCodesSet;
    return trashCodesSet;
  }

  static clearTrash(data: string): string {
    const trashCodesSet = this.getTrashCodes();

    let arr = data.replace("#h", "").split("//_//");
    let trashString = arr.join("");

    for (const code of trashCodesSet) {
      trashString = trashString.split(code).join("");
    }

    const finalString = Buffer.from(trashString + "==", "base64").toString(
      "utf-8",
    );
    return finalString;
  }

  async getOtherParts() {
    const $ = await this.getSoup();
    const parts = $(".b-post__partcontent");
    const other: any[] = [];

    if (parts.length) {
      parts.find(".b-post__partcontent_item").each((_, el) => {
        const $el = $(el);
        const num = $el.find(".num").text();
        const title = $el.find(".title").text();
        const year = $el.find(".year").text();
        const current = $el.hasClass("current");
        other.push({
          title,
          num: Number(num),
          year: Number(year.replace(/\D/g, "")),
          url: current ? this._currentUrl : $el.attr("data-url"),
          current,
        });
      });
    }
    return other;
  }

  static getEpisodes(s: string, e: string) {
    const $seasons = cheerio.load(s);
    const $episodes = cheerio.load(e);

    const seasons_: Record<number, string> = {};
    $seasons(".b-simple_season__item").each((_, el) => {
      const id = parseInt($seasons(el).attr("data-tab_id") || "0");
      seasons_[id] = $seasons(el).text();
    });

    const episodes_: Record<number, Record<number, string>> = {};
    $episodes(".b-simple_episode__item").each((_, el) => {
      const season = parseInt($episodes(el).attr("data-season_id") || "0");
      const episode = parseInt($episodes(el).attr("data-episode_id") || "0");
      const text = $episodes(el).text();

      if (!episodes_[season]) episodes_[season] = {};
      episodes_[season][episode] = text;
    });

    return { seasons: seasons_, episodes: episodes_ };
  }

  async getSeriesInfo() {
    if (!((await this.getType()) instanceof TVSeries)) {
      throw new Error(
        "The `seriesInfo` attribute is only available for TVSeries.",
      );
    }
    if (this._seriesInfo) return this._seriesInfo;

    const translators = await this.getTranslators();
    const id = await this.getId();

    // Parallelize API requests for better performance
    const requests = Object.entries(translators).map(
      async ([tr_id, tr_val]) => {
        const formData = new URLSearchParams();
        formData.append("id", String(id));
        formData.append("translator_id", tr_id);
        formData.append("action", "get_episodes");

        try {
          const r = await axios.post(
            `${this.origin}/ajax/get_cdn_series/`,
            formData.toString(),
            {
              ...this.getAxiosConfig(),
              headers: {
                ...this.customHeaders,
                "Content-Type": "application/x-www-form-urlencoded",
              },
            },
          );
          const response = r.data;

          if (response.success) {
            const { seasons, episodes } = StreamingAPI.getEpisodes(
              response.seasons,
              response.episodes,
            );
            return [
              parseInt(tr_id),
              {
                translator_name: tr_val.name,
                premium: tr_val.premium,
                seasons,
                episodes,
              },
            ];
          }
        } catch (error) {
          // Skip failed requests
          return null;
        }
        return null;
      },
    );

    const results = await Promise.all(requests);
    this._seriesInfo = Object.fromEntries(
      results.filter((r): r is [number, any] => r !== null),
    );
    return this._seriesInfo;
  }

  async getEpisodesInfo() {
    if (!((await this.getType()) instanceof TVSeries)) {
      throw new Error(
        "The `episodesInfo` attribute is only available for TVSeries.",
      );
    }
    if (this._episodesInfo) return this._episodesInfo;

    const seriesInfo = await this.getSeriesInfo();
    const seasonsMap = new Map<number, any>();

    for (const [translator_id, translator_info] of Object.entries(seriesInfo)) {
      const tInfo = translator_info as any;
      const translator_name = tInfo.translator_name;
      const premium = tInfo.premium;

      for (const [season, season_text] of Object.entries(tInfo.seasons)) {
        const seasonNum = parseInt(season);

        if (!seasonsMap.has(seasonNum)) {
          seasonsMap.set(seasonNum, {
            season: seasonNum,
            season_text,
            episodes: new Map(),
          });
        }

        const seasonObj = seasonsMap.get(seasonNum)!;
        const eps = tInfo.episodes[season] || {};

        for (const [episode, episode_text] of Object.entries(eps)) {
          const epNum = parseInt(episode);

          if (!seasonObj.episodes.has(epNum)) {
            seasonObj.episodes.set(epNum, {
              episode: epNum,
              episode_text,
              translations: [],
            });
          }

          seasonObj.episodes.get(epNum)!.translations.push({
            translator_id: parseInt(translator_id),
            translator_name,
            premium,
          });
        }
      }
    }

    // Convert Maps back to arrays
    this._episodesInfo = Array.from(seasonsMap.values()).map((season) => ({
      ...season,
      episodes: Array.from(season.episodes.values()),
    }));

    return this._episodesInfo;
  }

  async getStream({
    season,
    episode,
    translation,
    priority,
    non_priority,
  }: {
    season?: number;
    episode?: number;
    translation?: string | number;
    priority?: number[];
    non_priority?: number[];
  }) {
    const makeRequest = async (data: any) => {
      const params = new URLSearchParams(data).toString();
      const r = await axios.post(
        `${this.origin}/ajax/get_cdn_series/`,
        params,
        {
          ...this.getAxiosConfig(),
          headers: {
            ...this.customHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      const json = r.data;

      if (json.success && json.url) {
        const arr = StreamingAPI.clearTrash(json.url).split(",");
        const stream = new Stream(
          season || null,
          episode || null,
          await this.getName(),
          data.translator_id,
          { data: json.subtitle, codes: json.subtitle_lns },
        );

        for (const i of arr) {
          const temp = i.split("[")[1].split("]");
          const quality = String(temp[0]);
          const links = temp[1].split(" or ").filter((x) => x.endsWith(".mp4"));
          for (const video of links) {
            stream.append(quality, video);
          }
        }
        return stream;
      }
      throw new FetchFailed();
    };

    const getStreamSeries = (
      season: number,
      episode: number,
      translation_id: number,
    ) => {
      return makeRequest({
        id: this._id,
        translator_id: translation_id,
        season,
        episode,
        action: "get_stream",
      });
    };

    const getStreamMovie = (translation_id: number) => {
      return makeRequest({
        id: this._id,
        translator_id: translation_id,
        action: "get_movie",
      });
    };

    const get_translator_id = (translators: any[]) => {
      const translators_dict: Record<number, any> = {};
      translators.forEach((t) => {
        translators_dict[t.translator_id] = {
          name: t.translator_name,
          premium: t.premium,
        };
      });

      if (translation) {
        if (!isNaN(Number(translation))) {
          const trId = Number(translation);
          if (translators_dict[trId]) return trId;
          throw new Error(
            `Translation with code "${translation}" is not defined`,
          );
        } else {
          const found = translators.find(
            (d) => d.translator_name === translation,
          );
          if (found) return found.translator_id;
          throw new Error(`Translation "${translation}" is not defined`);
        }
      } else {
        return translators[0]?.translator_id;
      }
    };

    await this.getId();
    const type = await this.getType();
    const isTVSeries = type instanceof TVSeries;
    const isMovie = type instanceof Movie;

    if (isTVSeries) {
      if (!season || !episode)
        throw new TypeError(
          "getStream() missing required arguments (season and episode) for Series",
        );

      const epInfo = await this.getEpisodesInfo();
      const seasonObj = epInfo?.find((s) => s.season === season);
      if (!seasonObj) throw new Error(`Season "${season}" is not found!`);

      const episodeObj = seasonObj.episodes.find(
        (e: any) => e.episode === episode,
      );
      if (!episodeObj)
        throw new Error(
          `Episode "${episode}" in season "${season}" is not found!`,
        );

      const tr_id = get_translator_id(episodeObj.translations);
      return getStreamSeries(season, episode, tr_id);
    } else if (isMovie) {
      const translatorsMap = await this.getTranslators();
      const translatorsList = Object.entries(translatorsMap).map(
        ([id, details]) => ({
          translator_id: parseInt(id),
          translator_name: details.name,
          premium: details.premium,
        }),
      );
      const tr_id = get_translator_id(translatorsList);
      return getStreamMovie(tr_id);
    } else {
      throw new TypeError("Undefined content type");
    }
  }
}
