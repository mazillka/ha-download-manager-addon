<script setup lang="ts">
import { EmptyState, ContentGrid, SkeletonGrid } from "../";
import { useSearchStore } from "../../stores/search";
import { useAppStore } from "../../stores/app";
import { storeToRefs } from "pinia";

const searchStore = useSearchStore();
const { query, results, hasSearched } = storeToRefs(searchStore);

const appStore = useAppStore();
const { isLoading } = storeToRefs(appStore);
</script>

<template>
    <div class="search-tab">
        <v-row class="mb-4" align="center">
            <!-- Input -->
            <v-col cols="12">
                <v-text-field v-model="query" placeholder="Search..." density="comfortable" variant="outlined"
                    hide-details :disabled="isLoading" @keyup.enter="searchStore.search(true)"
                    @keyup.esc="searchStore.clear">
                    <template #append-inner>
                        <v-btn icon="mdi-magnify" variant="text" :loading="isLoading"
                            @click="searchStore.search(true)" />
                        <v-btn icon="mdi-close" variant="text" :disabled="isLoading || !query" v-if="query"
                            @click="searchStore.clear" />
                    </template>
                </v-text-field>
            </v-col>
        </v-row>

        <skeleton-grid v-if="isLoading && results.length === 0" :count="12" />

        <empty-state v-else-if="!isLoading && results.length === 0" icon="" title="" message="" />

        <content-grid v-else :items="results" @get-details="appStore.getDetails" />

        <div v-if="hasSearched && results.length > 0 && results.length % 20 === 0" class="d-flex justify-center mt-4">
            <v-btn variant="text" :loading="isLoading" @click="searchStore.loadMore">Load More</v-btn>
        </div>
    </div>
</template>
