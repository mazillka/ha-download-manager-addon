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
      waitForSelector: ".b-content__htitle",
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
      waitForSelector: ".b-content__htitle",
      evalArg: {
        funcString: ParseSearchFunc.toString(),
      },
    },
  );
};

export const GetDetails = async (
  url: string,
  category?: string,
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
      waitForSelector: ".b-post__title",
      evalArg: {
        category: category,
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
