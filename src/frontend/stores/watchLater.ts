import { defineStore } from "pinia";
import { api } from "../api";
import type { WatchLater } from "../../common/interfaces";

export const useWatchLaterStore = defineStore("watchLater", {
  state: () => ({
    watchLaterUrls: new Set<string>(),
    loaded: false,
    loading: false,
  }),

  getters: {
    has: (state) => {
      return (item: WatchLater) => state.watchLaterUrls.has(item.url);
    },
    list: (state) => state.watchLaterUrls,
  },

  actions: {
    async init() {
      if (this.loaded || this.loading) return;

      this.loading = true;
      try {
        const { list } = await api.getWatchLaterUrls();
        this.watchLaterUrls = new Set(list);
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },

    async add(item: WatchLater) {
      if (this.watchLaterUrls.has(item.url)) return;

      await api.addWatchLater(item);
      this.watchLaterUrls.add(item.url);
    },

    async remove(item: WatchLater) {
      await api.deleteWatchLater(item.url);
      this.watchLaterUrls.delete(item.url);
    },
  },
});
