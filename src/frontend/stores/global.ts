import { defineStore } from "pinia";

export const useGlobalStore = defineStore("global", {
  state: () => ({
    translator: undefined as string | undefined,
    season: undefined as string | undefined,
    episode: undefined as string | undefined,
  }),

  getters: {},

  actions: {
    setTranslator(id: string) {
      this.translator = id;
    },
    setSeason(id: string) {
      this.season = id;
    },
    setEpisode(id: string) {
      this.episode = id;
    },
  },
});
