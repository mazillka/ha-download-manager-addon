import { defineStore } from "pinia";

export const useGlobalStore = defineStore("global", {
  state: () => ({
    category: undefined as string | undefined,
    translator: undefined as string | undefined,
    season: undefined as string | undefined,
    episode: undefined as string | undefined,
  }),

  getters: {},

  actions: {
    setCategory(id: string) {
      this.category = id;
    },
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
