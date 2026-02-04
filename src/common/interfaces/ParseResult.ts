export default interface ParseResult {
  url: string;
  isTVSeries: boolean;
  isMovie: boolean;
  category: any;
  releaseYear: string;
  name: string;
  originalName: string | null;
  description: string;
  image: string | undefined;

  names: string[];
  originalNames: string[];

  otherParts: any[];

  translations: any[];

  seasonsInfo: any[] | undefined;

  activeTranslation: any;
  activeSeason: any | undefined;
  activeEpisode: any | undefined;

  streams: any;
}
