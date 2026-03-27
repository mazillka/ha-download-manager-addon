import { defineStore } from "pinia";
import { ref } from "vue";
import { api, subscribeLoading } from "../api";
import type { DetailsResult } from "../../common/interfaces";

export const useAppStore = defineStore("app", () => {
  const isLoading = ref(false);
  const activeTab = ref("search");
  const parseResult = ref<DetailsResult | null>(null);

  // Wire up global loading state from api
  subscribeLoading((v) => (isLoading.value = v));

  const tabs = ref([
    { id: "search", name: "Search", icon: "mdi-magnify" },
    { id: "watching", name: "Watching Now", icon: "mdi-movie-roll" },
    { id: "latest", name: "Latest arrivals", icon: "mdi-trending-up" },
    { id: "popular", name: "Popular", icon: "mdi-fire" },
    { id: "downloads", name: "Downloads", icon: "mdi-download" },
    { id: "watch-later", name: "Watch Later", icon: "mdi-sync" },
    { id: "settings", name: "Settings", icon: "mdi-cogs" },
  ]);

  const tabQueries: Record<string, string> = {
    watching: "watching",
    popular: "popular",
    latest: "last",
  };

  const tabSearchResults = ref<
    {
      url: string;
      name: string;
      year: string;
      image: string;
      category?: { name: string };
    }[]
  >([]);

  async function setActiveTab(tabId: string) {
    activeTab.value = tabId;

    const filter = tabQueries[tabId];
    if (filter) {
      await getTabSearchResults(filter);
    }
  }

  async function getTabSearchResults(filter: string) {
    tabSearchResults.value = [];
    const { list } = await api.getSearchResults({ query: undefined, filter });
    tabSearchResults.value = list;
  }

  async function getDetails({
    url,
    category,
    translator,
    season,
    episode,
  }: {
    url: string;
    category?: string;
    translator?: string;
    season?: string;
    episode?: string;
  }) {
    parseResult.value = null;
    const { details } = await api.getDetails({
      url,
      category,
      translator,
      season,
      episode,
    });
    parseResult.value = details;
  }

  return {
    isLoading,
    activeTab,
    parseResult,
    tabs,
    tabSearchResults,
    setActiveTab,
    getDetails,
  };
});
