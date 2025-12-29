import { BrowserService } from "./index.js";
import type { SearchResult, ParseResult } from "../interfaces/index.js";
import { SearchHelper, ParseHelper } from "../helpers/index.js";

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
  data_translator_id?: string
): Promise<ParseResult> => {
  const data = await BrowserService.parse(
    url,
    async (evalArg: any) => {
      const func = new Function(`return (${evalArg.funcString})`)();
      return func();
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

  const isShow = data.seasons.length > 0;

  const activeEpisode = data.episodes.find((x: any) => x.active);
  const seasonAndEipisode = activeEpisode
    ? `S${activeEpisode.data_season_id}E${activeEpisode.data_episode_id} `
    : "";

  let yearStr = "";
  if (!isShow) {
    yearStr = ` (${data.year}) `;
  }

  return {
    isShow: isShow,
    year: data.year,
    title: data.title,
    titleOriginal: data.titleOriginal,
    posterUrl: data.posterUrl,
    streams: data.streams.map((originalStream: any) => {
      return {
        quality: originalStream.quality,
        mp4FileName: `${
          data.titleOriginal || data.title
        } ${yearStr}${seasonAndEipisode}[${originalStream.quality}].mp4`,
        mp4: originalStream.mp4,
        mp4Android: `intent:${originalStream.mp4}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`,
      };
    }),
    translations: data.translations,
    seasons: data.seasons,
    episodes: data.episodes
  };
};

export default { search, parse };
