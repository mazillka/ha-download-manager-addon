import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api";
import type { SearchResult } from "../../common/interfaces";

export const useSearchStore = defineStore("search", () => {
  const query = ref("");
  const results = ref<SearchResult[]>([]);
  const page = ref(1);
  const hasSearched = ref(false);

  async function search(reset: boolean = false) {
    if (!query.value) return;

    if (reset) {
      page.value = 1;
      results.value = [];
    }

    hasSearched.value = true;

    const { list } = await api.getSearchResults({
      query: query.value,
      filter: undefined,
      page: page.value,
    });

    if (reset) {
      results.value = list;
    } else {
      results.value = [...results.value, ...list];
    }
  }

  async function loadMore() {
    page.value++;
    await search(false);
  }

  function clear() {
    query.value = "";
    results.value = [];
    hasSearched.value = false;
    page.value = 1;
  }

  return {
    query,
    results,
    page,
    hasSearched,
    search,
    loadMore,
    clear,
  };
});
