export default interface SearchResult {
  name: string;
  url: string;
  image: string;
  year: string;
  category: {
    name: string;
    category: string;
  };
}
