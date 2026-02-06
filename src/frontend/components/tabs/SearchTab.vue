<script setup lang="ts">
import { ref } from "vue";
import { EmptyState, ContentGrid, SkeletonGrid } from "../";
import { SearchResult } from "../../../common/interfaces";
import { api } from "../../api";

const props = defineProps<{
    isLoading: boolean;
}>();

const emit = defineEmits<{
    (e: "get-details", item: SearchResult): void;
}>();

const query = ref("");
const searchResults = ref<SearchResult[]>([]);
const hasSearched = ref(false); // Track if a search has been performed
const page = ref(1);

async function onSearch(reset: boolean = false) {
    if (!query.value) return;

    if (reset) {
        page.value = 1;
        searchResults.value = [];
    }

    // We rely on the parent/global handling of loading state for now, 
    // but the API call will trigger the global loading listener
    const payload = {
        query: query.value,
        filter: undefined,
        page: page.value,
    };

    hasSearched.value = true;
    const { list } = await api.getSearchResults(payload);

    if (reset) {
        searchResults.value = list;
    } else {
        searchResults.value = [...searchResults.value, ...list];
    }
}

function onLoadMore() {
    page.value++;
    onSearch(false);
}

function onClear() {
    query.value = "";
    searchResults.value = [];
    hasSearched.value = false;
    page.value = 1;
}
</script>

<template>
    <div class="search-tab">
        <v-row class="mb-4" align="center">
            <!-- Input -->
            <v-col cols="12">
                <v-text-field v-model="query" placeholder="Search..." density="comfortable" variant="outlined"
                    hide-details :disabled="isLoading" @keyup.enter="onSearch(true)" @keyup.esc="onClear">
                    <template #append-inner>
                        <v-btn icon="mdi-magnify" variant="text" :loading="isLoading" @click="onSearch(true)" />
                        <v-btn icon="mdi-close" variant="text" :disabled="isLoading || !query" v-if="query"
                            @click="onClear" />
                    </template>
                </v-text-field>
            </v-col>
        </v-row>

        <skeleton-grid v-if="isLoading && searchResults.length === 0" :count="12" />

        <empty-state v-else-if="!isLoading && searchResults.length === 0" icon="" title="" message="" />

        <content-grid v-else :items="searchResults" @get-details="(item) => emit('get-details', item)" />

        <div v-if="hasSearched && searchResults.length > 0 && searchResults.length % 20 === 0"
            class="d-flex justify-center mt-4">
            <v-btn variant="text" :loading="isLoading" @click="onLoadMore">Load More</v-btn>
        </div>
    </div>
</template>
