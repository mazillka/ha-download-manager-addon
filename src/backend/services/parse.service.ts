import { ConfigService } from ".";
import { ConfigKey } from "../../common/enums";
import { PlaywrightService } from ".";
import type { SearchResult, DetailsResult } from "../../common/interfaces";
import { ParseSearchFunc, ParseDetailsFunc } from "../playwright";

export const Search = async (query: string): Promise<SearchResult[]> => {
  const baseUrl = await ConfigService.Get(ConfigKey.BaseUrl);
  const url = `${baseUrl}/search/?do=search&subaction=search&q=${query}`;

  return await PlaywrightService.Parse(
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
        funcString: ParseSearchFunc.toString(),
      },
    },
  );
};

export const Filter = async (filter: string): Promise<SearchResult[]> => {
  const baseUrl = await ConfigService.Get(ConfigKey.BaseUrl);
  const url = `${baseUrl}/?filter=${filter}`;

  return await PlaywrightService.Parse(
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
        funcString: ParseSearchFunc.toString(),
      },
    },
  );
};

export const GetDetails = async (
  url: string,
  translator?: string,
  season?: string,
  episode?: string,
): Promise<DetailsResult> => {
  return await PlaywrightService.Parse(
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
        translator: translator,
        season: season,
        episode: episode,
        url: url,
        funcString: ParseDetailsFunc.toString(),
      },
    },
  );
};

export default {
  Search,
  Filter,
  GetDetails,
};
