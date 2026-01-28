import { BrowserService } from ".";
import type { SearchResult, ParseResult } from "../../common/interfaces";

export const Search = (url: string): Promise<SearchResult[]> =>
  BrowserService.Parse({
    pageUrl: url,
    initScripts: ["../playwrightScrtips/search.js"],
    evaluate: () => (window as any).GetSearchResults(),
    options: {
      waitForSelector: ".b-content__htitle",
    },
  });

export const GetDetails = (
  url: string,
  data_translator_id?: string,
): Promise<ParseResult> =>
  BrowserService.Parse({
    pageUrl: url,
    initScripts: ["../playwrightScrtips/details.js"],
    evaluate: (evalArg) => (window as any).GetDetails(evalArg),
    options: {
      waitForSelector: ".b-post__title",
      evalArg: data_translator_id ? { data_translator_id } : undefined,
    },
  });

export default { Search, GetDetails };
