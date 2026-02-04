import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";

// --- Types & Stubs (аналоги з .types та .errors) ---

class CustomError extends Error {}
class LoginRequiredError extends CustomError {}
class LoginFailed extends CustomError {}
class FetchFailed extends CustomError {}
class CaptchaError extends CustomError {}
class HTTPError extends CustomError {
  constructor(
    public code: number,
    public reason: string,
  ) {
    super(`${code} ${reason}`);
  }
}

// Заглушки для типів контенту
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

export class CategoryType {}
export class Film extends CategoryType {}
export class Series extends CategoryType {}
export class Cartoon extends CategoryType {}
export class Anime extends CategoryType {}
export class Category extends CategoryType {
  constructor(public name: string) {
    super();
  }
}

export interface Rating {
  value: number;
  votes: number;
}

// Потік (Stream)
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

// Константи
const default_cookies: Record<string, string> = {};
const default_headers: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
};
const default_translators_priority: number[] = [];
const default_translators_non_priority: number[] = [];

// --- Main Class ---

export class Details {
  url: string;
  origin: string;
  proxy: any;
  customHeaders: Record<string, string>;
  cookies: Record<string, string>;
  private _translators_priority: number[];
  private _translators_non_priority: number[];

  // Cache storage
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

  constructor({
    url,
    options = {},
  }: {
    url: string;
    options: {
      proxy?: any;
      customHeaders?: Record<string, string>;
      cookies?: Record<string, string>;
      translators_priority?: number[];
      translators_non_priority?: number[];
    };
  }) {
    this.url = url.split(".html")[0] + ".html";
    const uri = new URL(url);
    this.origin = `${uri.protocol}//${uri.host}`;
    this.proxy = options.proxy || {};
    this.cookies = { ...default_cookies, ...(options.cookies || {}) };
    this.customHeaders = {
      ...default_headers,
      ...(options.customHeaders || {}),
    };
    this._translators_priority =
      options.translators_priority || default_translators_priority;
    this._translators_non_priority =
      options.translators_non_priority || default_translators_non_priority;
  }

  toString(): string {
    return `("${this.url}")`; // Спрощено, бо ім'я асинхронне
  }

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

  async ok(): Promise<boolean> {
    try {
      return !!(await this.getSoup());
    } catch {
      return false;
    }
  }

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
        headers: {
          ...this.customHeaders,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        ...this.getAxiosConfig(), // Proxy included here
      },
    );

    const data = response.data;
    if (data.success) {
      // Оновлюємо куки з відповіді (спрощена логіка, для повного стеку треба tough-cookie)
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

  // Helper для Axios конфігурації
  private getAxiosConfig() {
    // Формуємо рядок Cookie header
    const cookieHeader = Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    return {
      headers: { ...this.customHeaders, Cookie: cookieHeader },
      proxy: Object.keys(this.proxy).length > 0 ? this.proxy : false,
      validateStatus: () => true, // Дозволяємо ручну обробку кодів
    };
  }

  async getPage(): Promise<AxiosResponse> {
    if (this._page) return this._page;
    const r = await axios.get(this.url, {
      ...this.getAxiosConfig(),
      maxRedirects: 5,
    });

    if (r.status >= 200 && r.status < 300) {
      this._page = r;
      return r;
    }
    throw new HTTPError(r.status, r.statusText);
  }

  async getSoup(): Promise<cheerio.CheerioAPI> {
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
    if (!val) val = this.url.split("/").pop()?.split("-")[0];

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
    const uri = new URL(this.url);
    const cat = uri.pathname.replace(/^\//, "").split("/")[0];

    if (cat === "films") this._category = new Film();
    else if (cat === "series") this._category = new Series();
    else if (cat === "cartoons") this._category = new Cartoon();
    else if (cat === "animation") this._category = new Anime();
    else this._category = new Category(cat);

    return this._category;
  }

  async getRating(): Promise<Rating | null> {
    if (this._rating) return this._rating;
    const $ = await this.getSoup();
    const wrapper = $(".b-post__rating");
    if (wrapper.length) {
      const rating = parseFloat(wrapper.find(".num").text());
      const votes = parseInt(
        wrapper.find(".votes").text().replace(/[()]/g, ""),
      );
      this._rating = { value: rating, votes: votes };
    } else {
      this._rating = null;
    }
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
      // Auto-detect
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
        // Need strict type check logic or string comparison
        const typeKey =
          type instanceof TVSeries ? "video.tv_series" : "video.movie";
        const scriptText = $doc.text(); // Simplification: searching whole text
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
    const prior: Record<number, number> = {};
    const pList = priority || this._translators_priority || [];

    pList.forEach((item, index) => {
      prior[item] = index + 1;
    });

    const maxIndex = Object.keys(prior).length + 1;
    const npList = non_priority || this._translators_non_priority || [];

    npList.forEach((item, index) => {
      if (!(item in prior)) {
        prior[item] = maxIndex + index + 1;
      }
    });

    return Object.fromEntries(
      Object.entries(currentTranslators).sort((a, b) => {
        const idA = parseInt(a[0]);
        const idB = parseInt(b[0]);
        const rankA = prior[idA] || maxIndex;
        const rankB = prior[idB] || maxIndex;
        return rankA - rankB;
      }),
    );
  }

  static clearTrash(data: string): string {
    const trashList = ["@", "#", "!", "^", "$"];
    const trashCodesSet: string[] = [];

    // Helper to generate combinations (product)
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
        const title = $el.find(".title").text();
        if ($el.hasClass("current")) {
          other.push({ [title]: this.url });
        } else {
          other.push({ [title]: $el.attr("data-url") });
        }
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
      const seasonId = parseInt($episodes(el).attr("data-season_id") || "0");
      const episodeId = parseInt($episodes(el).attr("data-episode_id") || "0");
      const text = $episodes(el).text();

      if (!episodes_[seasonId]) episodes_[seasonId] = {};
      episodes_[seasonId][episodeId] = text;
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

    const arr: Record<number, any> = {};
    const translators = await this.getTranslators();
    const id = await this.getId();

    for (const [tr_id, tr_val] of Object.entries(translators)) {
      const formData = new URLSearchParams();
      formData.append("id", String(id));
      formData.append("translator_id", tr_id);
      formData.append("action", "get_episodes");

      const r = await axios.post(
        `${this.origin}/ajax/get_cdn_series/`,
        formData.toString(),
        {
          headers: {
            ...this.customHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          ...this.getAxiosConfig(),
        },
      );
      const response = r.data;

      if (response.success) {
        const { seasons, episodes } = Details.getEpisodes(
          response.seasons,
          response.episodes,
        );
        arr[parseInt(tr_id)] = {
          translator_name: tr_val.name,
          premium: tr_val.premium,
          seasons,
          episodes,
        };
      }
    }
    this._seriesInfo = arr;
    return arr;
  }

  async getEpisodesInfo() {
    if (!((await this.getType()) instanceof TVSeries)) {
      throw new Error(
        "The `episodesInfo` attribute is only available for TVSeries.",
      );
    }
    if (this._episodesInfo) return this._episodesInfo;

    const output_data: any[] = [];
    const seriesInfo = await this.getSeriesInfo();

    for (const [translator_id, translator_info] of Object.entries(seriesInfo)) {
      const tInfo = translator_info as any;
      const translator_name = tInfo.translator_name;
      const premium = tInfo.premium;

      for (const [season, season_text] of Object.entries(tInfo.seasons)) {
        const seasonNum = parseInt(season);
        let season_obj = output_data.find((s) => s.season === seasonNum);

        if (!season_obj) {
          season_obj = {
            season: seasonNum,
            season_text: season_text,
            episodes: [],
          };
          output_data.push(season_obj);
        }

        const eps = tInfo.episodes[season] || {};
        for (const [episode, episode_text] of Object.entries(eps)) {
          const epNum = parseInt(episode);
          let episode_obj = season_obj.episodes.find(
            (e: any) => e.episode === epNum,
          );

          if (!episode_obj) {
            episode_obj = {
              episode: epNum,
              episode_text: episode_text,
              translations: [],
            };
            season_obj.episodes.push(episode_obj);
          }

          episode_obj.translations.push({
            translator_id: parseInt(translator_id),
            translator_name: translator_name,
            premium: premium,
          });
        }
      }
    }
    this._episodesInfo = output_data;
    return output_data;
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
          headers: {
            ...this.customHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          ...this.getAxiosConfig(),
        },
      );
      const json = r.data;

      if (json.success && json.url) {
        const arr = Details.clearTrash(json.url).split(",");
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
        id: this._id, // Assumes ID is loaded
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
        // Sorting logic needed here, simplified to first available
        // To implement fully, port sort_translators logic specifically for this structure
        return translators[0]?.translator_id;
      }
    };

    // Ensure essential data is loaded
    await this.getId();
    const type = await this.getType();

    if (type instanceof TVSeries) {
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
    } else if (type instanceof Movie) {
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
