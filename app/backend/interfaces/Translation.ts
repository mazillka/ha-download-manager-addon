export default interface Translation {
  name: string;
  active: boolean;
  data_id: string | null;
  data_translator_id: string | null;
  is_camrip: string | null;
  is_ads: string | null;
  is_director: string | null;
  url: string;
}
