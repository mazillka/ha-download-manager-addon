import type { Episode, Season, Stream, Translation } from "./index.js";

export default interface ParseResult {
  isShow: boolean;
  year: number | string;
  title: string;
  titleOriginal: string;
  posterUrl: string;
  streams: Stream[];
  translations: Translation[];
  seasons: Season[];
  episodes: Episode[];
  debug: any;
}
