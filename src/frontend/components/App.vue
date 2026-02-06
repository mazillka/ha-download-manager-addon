<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
    LoadingOverlay,
    DetailsModal,
    ContentGrid,
    ErrorBoundary,
    ToastNotification,
    SearchTab,
    DownloadsTab,
    SettingsTab,
    WatchLaterTab,
    EmptyState,
    SkeletonGrid,
} from ".";
import type {
    ParseResult,
    SearchResult,
} from "../../common/interfaces";
import { api, subscribeLoading } from "../api";

const isLoading = ref(false);

const searchResults = ref<SearchResult[]>([]);

const modal = ref<{
    item: ParseResult | null;
}>({
    item: null,
});

const toast = ref<{ display: (msg: string, color?: string) => void } | null>(null);

function showToast(message: string, color: string = "success") {
    toast.value?.display(message, color);
}

function initModal(data: ParseResult) {
    modal.value.item = data;
}

const activeTab = ref("search");

const tabs = [
    { id: "search", name: "Search", icon: "mdi-magnify" },
    { id: "watching", name: "Watching Now", icon: "mdi-movie-roll" },
    { id: "latest", name: "Latest arrivals", icon: "mdi-trending-up" },
    { id: "popular", name: "Popular", icon: "mdi-fire" },
    { id: "downloads", name: "Downloads", icon: "mdi-download" },
    { id: "watch-later", name: "Watch Later", icon: "mdi-sync" },
    { id: "settings", name: "Settings", icon: "mdi-cogs" },
];
const tabQueries = {
    watching: "watching",
    popular: "popular",
    latest: "last",
} as Record<string, string>;

onMounted(async () => {
    subscribeLoading((v) => (isLoading.value = v));
});

async function onSelectTab(tabId: string) {
    activeTab.value = tabId;

    const filter = tabQueries[tabId];
    if (filter) {
        const payload = {
            query: undefined,
            filter,
        };

        await getSearchResults(payload);
    }
}

async function getSearchResults(payload: object) {
    const { list } = await api.getSearchResults(payload);
    searchResults.value = list;
}

async function getDetails(url: string, data_translator_id?: string | null) {
    const { details } = await api.getDetails({ url, data_translator_id });
    initModal(details);
}

async function handleGetDetails(
    t: string | { url: string; data_translator_id?: string }
) {
    if (typeof t === "string") {
        await getDetails(t);
    } else if (t.url) {
        await getDetails(t.url);
    } else {
        await getDetails(t.url, t.data_translator_id);
    }
}
</script>

<style>
.swal2-container {
    z-index: 99999 !important;
}
</style>

<template>
    <v-app>
        <loading-overlay :loading="isLoading"></loading-overlay>

        <v-container>
            <v-tabs align-tabs="center" class="mb-6 rounded-lg elevation-2 bg-surface" v-model="activeTab"
                @update:model-value="onSelectTab" color="primary" slider-color="primary">
                <v-tab v-for="tab in tabs" :key="tab.id" :value="tab.id" class="text-capitalize font-weight-bold"
                    rounded="lg">
                    <v-icon :icon="tab.icon" start></v-icon>
                    {{ tab.name }}
                </v-tab>
            </v-tabs>

            <error-boundary>
                <v-window v-model="activeTab" class="pa-1">
                    <v-window-item value="search" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <search-tab :is-loading="isLoading" @get-details="handleGetDetails" />
                    </v-window-item>

                    <v-window-item v-for="tabKey in ['watching', 'latest', 'popular']" :key="tabKey" :value="tabKey"
                        transition="scroll-x-transition" reverse-transition="scroll-x-reverse-transition">

                        <skeleton-grid v-if="isLoading && searchResults.length === 0" :count="12" />

                        <content-grid v-else :is-loading="isLoading" :items="searchResults"
                            :empty-message="`No ${tabKey} content available.`" @get-details="handleGetDetails" />
                    </v-window-item>

                    <v-window-item value="watch-later" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <watch-later-tab :is-loading="isLoading" @get-details="handleGetDetails"
                            @select-tab="onSelectTab" :active="activeTab === 'watch-later'" />
                    </v-window-item>

                    <v-window-item value="downloads" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <downloads-tab :is-loading="isLoading" @select-tab="onSelectTab"
                            :active="activeTab === 'downloads'" />
                    </v-window-item>

                    <v-window-item value="settings" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <settings-tab :active="activeTab === 'settings'" />
                    </v-window-item>
                </v-window>
            </error-boundary>

            <toast-notification ref="toast" />
        </v-container>
        <details-modal :item="modal.item"></details-modal>
    </v-app>
</template>
