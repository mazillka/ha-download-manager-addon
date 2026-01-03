import { BrowserService } from "./index";
import type { SearchResult, ParseResult } from "../interfaces/index";
import { SearchHelper, ParseHelper } from "../helpers/index";

export const search = async (url: string): Promise<SearchResult[]> => {
  return await BrowserService.parse(
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

export const parse = async (
  url: string,
  data_id?: string,
  data_translator_id?: string,
  is_camrip?: string,
  is_ads?: string,
  is_director?: string
): Promise<ParseResult> => {
  console.log(
    `url: ${url}, data_id: ${data_id}, data_translator_id: ${data_translator_id}, is_camrip: ${is_camrip}, is_ads: ${is_ads}, is_director: ${is_director}`
  );

  return await BrowserService.parse(
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
        data_id: data_id,
        data_translator_id: data_translator_id,
        is_camrip: is_camrip,
        is_ads: is_ads,
        is_director: is_director,
        funcString: ParseHelper.toString(),
      },
    }
  );
};

export default { search, parse };
