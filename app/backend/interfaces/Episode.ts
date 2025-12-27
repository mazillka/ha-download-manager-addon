export default interface Episode {
  name: string;
  active: boolean;
  url: string;
  data_id: string | null;
  data_season_id: string | null;
  data_episode_id: string | null;
}
