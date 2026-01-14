import { BrowserService } from ".";
import type { SearchResult, ParseResult } from "../../common/interfaces";
import { SearchHelper, ParseHelper } from "../helpers";

export const Search = async (url: string): Promise<SearchResult[]> => {
  return await BrowserService.Parse(
    url,
    (evalArg: any) => {
      const func = new Function(`return (${evalArg.funcString})`)();
      return func();
    },
    {
      timeout: 120000,
      strategies: ["domcontentloaded", "networkidle"],
      waitForSelector: ".b-content__htitle",
      selectorTimeout: 15000,
      evalArg: {
        funcString: SearchHelper.toString(),
      },
    }
  );
};

export const GetDetails = async (
  url: string,
  data_translator_id?: string,
): Promise<ParseResult> => {
  return await BrowserService.Parse(
    url,
    async (evalArg: any) => {
      const func = new Function(`return (${evalArg.funcString})`)();
      return func(evalArg);
    },
    {
      timeout: 120000,
      strategies: ["domcontentloaded", "networkidle"],
      waitForSelector: ".b-post__title",
      selectorTimeout: 15000,
      evalArg: {
        data_translator_id: data_translator_id,
        funcString: ParseHelper.toString(),
      },
    }
  );
};

export default { Search, GetDetails };
