import { ConfigService } from ".";
import { ConfigKey } from "../../common/enums";
import { SearchApi, DetailsApi } from "../api";

export const Search = async (
  query: string,
  page: number = 1,
): Promise<any[]> => {
  // TODO: specify proper TYPE for return
  const baseUrl = (await ConfigService.Get(ConfigKey.BaseUrl)) || "";
  const search = new SearchApi({ origin: baseUrl });

  const list = search.advancedSearch(query);

  return await list.getPage(page);
};

export const Filter = async (filter: string): Promise<any[]> => {
  // TODO: specify proper TYPE for return
  const baseUrl = (await ConfigService.Get(ConfigKey.BaseUrl)) || "";
  const search = new SearchApi({ origin: baseUrl });

  const list = await search.filter(filter);

  return list;
};

export const GetDetails = async (url: string): Promise<any | null> => {
  // TODO: specify proper TYPE for return
  const api = new DetailsApi({ url: url, options: {} });

  const type = await api.getType();

  const isTVSeries = type.isTVSeries();
  const isMovie = type.isMovie();

  const translations = await api.getTranslators();

  const [id, value] = Object.entries(translations)[0];
  const defaultTranslationId = Number(id);

  const activeTranslation = {
    translator_id: Number(id),
    translator_name: value.name,
    premium: value.premium,
  };

  let seasonsInfo = undefined;
  let activeSeason = undefined;
  let activeEpisode = undefined;

  if (isTVSeries) {
    seasonsInfo = await api.getEpisodesInfo();

    const result = seasonsInfo.find((season) =>
      season.episodes.find((episode: any) =>
        episode.translations.some(
          (t: any) => t.translator_id === defaultTranslationId,
        ),
      ),
    );

    if (result) {
      activeSeason = result;
      activeEpisode = result.episodes.find((episode: any) =>
        episode.translations.some(
          (t: any) => t.translator_id === defaultTranslationId,
        ),
      );
    }
  }

  return {
    url: url,
    isTVSeries: isTVSeries,
    isMovie: isMovie,
    releaseYear: await api.getReleaseYear(),
    names: await api.getNames(),
    originalNames: await api.getOrigNames(),
    name: await api.getName(),
    originalName: await api.getOrigName(),
    description: await api.getDescription(),
    image: await api.getThumbnail(),
    otherParts: await api.getOtherParts(),
    translations: await api.getTranslators(),

    activeTranslation: activeTranslation,

    ...(isTVSeries &&
      seasonsInfo && {
        seasonsInfo: seasonsInfo,
      }),

    ...(isTVSeries &&
      activeSeason && {
        activeSeason: activeSeason,
      }),

    ...(isTVSeries &&
      activeEpisode && {
        activeEpisode: activeEpisode,
      }),

    streams: await api.getStream({
      season: activeSeason ? activeSeason.season : 1,
      episode: activeEpisode ? activeEpisode.episode : 1,
      translation: defaultTranslationId,
    }),
  };
};

export const GetStreams = async (
  url: string,
  season?: number | undefined,
  episode?: number | undefined,
  translation?: number,
): Promise<any | null> => {
  // TODO: specify proper TYPE for return
  const api = new DetailsApi({ url: url, options: {} });

  let streams = api.getStream({
    season: season,
    episode: episode,
    translation: translation,
  });

  return streams;
};

export default { Search, Filter, GetDetails, GetStreams };
