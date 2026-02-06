import { ref, readonly } from "vue";
import { api } from "../api";
import type { WatchLater } from "../../common/interfaces";

const watchLaterUrls = ref<Set<string>>(new Set());
const loaded = ref(false);
const loading = ref(false);

export const useWatchLater = () => ({
  list: readonly(watchLaterUrls),
  loaded: readonly(loaded),
  loading: readonly(loading),

  async init() {
    if (loaded.value || loading.value) return;

    loading.value = true;
    try {
      const { list } = await api.getWatchLaterUrls();
      watchLaterUrls.value = new Set(list);
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  },

  async add(item: WatchLater) {
    if (watchLaterUrls.value.has(item.url)) return;

    await api.addWatchLater(item);

    watchLaterUrls.value.add(item.url);
  },

  async remove(item: WatchLater) {
    await api.deleteWatchLater(item.url);

    watchLaterUrls.value.delete(item.url);
  },

  has(item: WatchLater) {
    return watchLaterUrls.value.has(item.url);
  },
});
