export default interface DetailsResult {
  version: string;
  url: string;
  isTVSeries: boolean;
  releaseYear: string;
  name: string;
  originalName: string | null;
  description: string;
  image: string | undefined;

  category: string;

  otherParts: any[];

  translations: any[];
  seasons: any[];
  episodes: any[];

  streams: any;
}
