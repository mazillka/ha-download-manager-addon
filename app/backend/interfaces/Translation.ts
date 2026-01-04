export default interface Translation {
  name: string;
  active: boolean;
  data_id: string | null;
  data_translator_id: string | null;
  url: string;
}
