<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
    LoadingOverlay,
    DetailsModal,
    AddToWatchLaterButton,
    RemoveFromWatchLaterButton,
} from ".";
import {
    Config,
    ParseResult,
    SearchResult,
    WatchLater,
} from "../../common/interfaces";
import { api, subscribeLoading } from "../api";
import { formatBytes } from "../utils/format";
import { ConfigKey } from "../../common/enums";
import { showConfirm } from "../utils/alerts";

const isLoading = ref(false);
const query = ref("");
const searchResults = ref<SearchResult[]>([]);

const modal = ref<{
    item: ParseResult | null;
    url: string | null;
}>({
    item: null,
    url: null,
});

function initModal(data: ParseResult, url: string) {
    modal.value.item = data;
    modal.value.url = url;
}

const activeTab = ref("search");

const tabs = [
    { id: "search", name: "Search" },
    { id: "watching", name: "Watching Now" },
    { id: "latest", name: "Latest arrivals" },
    { id: "popular", name: "Popular" },
    { id: "downloads", name: "Downloads" },
    { id: "watch_later", name: "Watch Later" },
    { id: "settings", name: "Settings" },
];
const tabUrls = {
    watching: "?filter=watching",
    popular: "?filter=popular",
    latest: "?filter=last",
} as Record<string, string>;

const configs = ref<Config[]>([]);
const serverDownloads = ref<any[]>([]);
const watchLaterList = ref<WatchLater[]>([]);

onMounted(async () => {
    subscribeLoading((v) => (isLoading.value = v));

    await getConfigs();
    await getWatchLaterList();
    await getServerDownloads();
});

const baseUrl = computed(() => {
    return (
        configs.value.find((x: any) => x.key === ConfigKey.BaseUrl)?.value || ""
    );
});

function translateCategory(category: string): string {
    if (!category) return '';

    const categoryMap: Record<string, string> = {
        "Сериал": "Show",
        "Фильм": "Movie",
        "Аниме": "Anime",
        "Мультфильм": "Cartoon",
    };

    return categoryMap[category] ?? category;
}

function isInWatchLater(pageUrl: string): boolean {
    return watchLaterList.value.some((x: WatchLater) => x.pageUrl === pageUrl);
}

async function onSelectTab(tabId: string) {
    activeTab.value = tabId;
    query.value = "";
    searchResults.value = [];

    if (tabId === "search") return;
    if (tabId === "settings") return getConfigs();
    if (tabId === "watch_later") return getWatchLaterList();
    if (tabId === "downloads") return getServerDownloads();

    const filter = tabUrls[tabId];
    if (filter) {
        await getSearchResults(`${baseUrl.value}/${filter}`);
    }
}

async function onSearch() {
    if (!query.value) return;

    const searchUrl = `${baseUrl.value
        }/search/?do=search&subaction=search&q=${encodeURIComponent(query.value)}`;
    await getSearchResults(searchUrl);
}

async function onClear() {
    query.value = "";
    searchResults.value = [];
}

async function getSearchResults(url: string) {
    const { list } = await api.getSearchResults(url);
    searchResults.value = list;
}

async function getDetails(url: string, data_translator_id?: string | null) {
    const { details } = await api.getDetails({ url, data_translator_id });
    initModal(details, url);
}

async function getConfigs() {
    const { list } = await api.getConfigs();
    configs.value = list;
}

async function saveConfig() {
    const { list } = await api.saveConfigs(configs.value);
    configs.value = list;
}

async function getServerDownloads() {
    const { list } = await api.getServerDownloads();
    serverDownloads.value = list;
}

async function getWatchLaterList() {
    const { list } = await api.getWatchLater();
    watchLaterList.value = list;
}

async function cancelServerDownload(id: string) {
    const ok = await showConfirm({
        title: "Cancel Server Download",
        text: "Are you sure you want to cancel server download?",
    });

    if (!ok) return;

    await api.cancelServerDownload(id);
}

async function pauseServerDownload(id: string) {
    await api.pauseServerDownload(id);
}

async function resumeServerDownload(id: string) {
    await api.resumeServerDownload(id);
}

async function deleteServerDownload(id: string) {
    const ok1 = await showConfirm({
        title: "Delete Server Download",
        text: "Are you sure you want to delete server download?",
    });

    if (!ok1) return;

    const ok2 = await showConfirm({
        title: "Delete File From Disk",
        text: "Are you sure you want to delete file from disk?",
    });

    await api.deleteServerDownload(id, ok2);
}

async function syncWatchLater() {
    await api.syncWatchLater(watchLaterList.value);
}

async function handleGetDetails(
    t: string | { url?: string; data_translator_id?: string }
) {
    if (typeof t === "string") {
        await getDetails(t);
    } else if (t.url) {
        await getDetails(t.url);
    } else {
        await getDetails(modal.value.url!, t.data_translator_id);
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
            <v-tabs align-tabs="center" class="mb-4" v-model="activeTab" @update:model-value="onSelectTab">
                <v-tab v-for="tab in tabs" :key="tab.id" :value="tab.id">
                    {{ tab.name }}
                </v-tab>
            </v-tabs>

            <v-window v-model="activeTab">
                <v-window-item value="search">
                    <v-row class="mb-4" align="center">
                        <!-- Input -->
                        <v-col cols="12">
                            <v-text-field v-model="query" placeholder="Search..." density="comfortable"
                                variant="outlined" hide-details :disabled="isLoading" @keyup.enter="onSearch">
                                <!-- Desktop inline buttons -->
                                <template #append>
                                    <div class="d-none d-md-flex gap-2">
                                        <v-btn class="mr-1" color="success" :loading="isLoading" @click="onSearch">
                                            Search
                                        </v-btn>
                                        <v-btn variant="outlined" :disabled="isLoading || !query" @click="onClear">
                                            Clear
                                        </v-btn>
                                    </div>
                                </template>
                            </v-text-field>
                        </v-col>

                        <!-- Mobile stacked buttons -->
                        <v-col cols="12" class="d-flex d-md-none flex-column gap-2 mt-2">
                            <v-btn class="mb-1" block color="success" :loading="isLoading" @click="onSearch">
                                Search
                            </v-btn>
                            <v-btn block variant="outlined" :disabled="isLoading || !query" @click="onClear">
                                Clear
                            </v-btn>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col v-for="(item, index) in searchResults" :key="index" cols="12" sm="6" md="4" lg="3"
                            xl="2">
                            <v-card height="100%" @click="handleGetDetails(item.pageUrl)">
                                <v-img :src="item.posterUrl" :alt="item.title" height="150px" contain>
                                    <v-chip v-if="item.category" class="ma-2" color="primary" label>
                                        {{ translateCategory(item.category) }}
                                    </v-chip>
                                </v-img>
                                <v-card-title>{{ item.title }} ({{ item.year }})</v-card-title>
                                <v-card-actions>
                                    <add-to-watch-later-button v-if="!isInWatchLater(item.pageUrl)" :title="item.title"
                                        :year="item.year" :page-url="item.pageUrl"
                                        :poster-url="item.posterUrl" @get-watch-later-list="getWatchLaterList"></add-to-watch-later-button>
                                    <remove-from-watch-later-button v-if="isInWatchLater(item.pageUrl)"
                                        :page-url="item.pageUrl" @get-watch-later-list="getWatchLaterList"></remove-from-watch-later-button>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

                <v-window-item v-for="tabKey in ['watching', 'latest', 'popular']" :key="tabKey" :value="tabKey">
                    <v-row>
                        <v-col v-for="(item, index) in searchResults" :key="index" cols="12" sm="6" md="4" lg="3"
                            xl="2">
                            <v-card height="100%" @click="handleGetDetails(item.pageUrl)">
                                <v-img :src="item.posterUrl" :alt="item.title" height="150px" contain>
                                    <v-chip v-if="item.category" class="ma-2" color="primary" label>
                                        {{ translateCategory(item.category) }}
                                    </v-chip>
                                </v-img>
                                <v-card-title>{{ item.title }}</v-card-title>
                                <v-card-actions>
                                    <add-to-watch-later-button v-if="!isInWatchLater(item.pageUrl)" :title="item.title"
                                        :year="item.year" :page-url="item.pageUrl"
                                        :poster-url="item.posterUrl" @get-watch-later-list="getWatchLaterList"></add-to-watch-later-button>
                                    <remove-from-watch-later-button v-if="isInWatchLater(item.pageUrl)"
                                        :page-url="item.pageUrl" @get-watch-later-list="getWatchLaterList"></remove-from-watch-later-button>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

                <v-window-item value="watch_later">
                    <v-alert v-if="!watchLaterList || watchLaterList.length === 0" type="info" class="mt-5" prominent>
                        No items in Watch Later
                    </v-alert>
                    <v-row v-else>
                        <v-col v-for="(item, index) in watchLaterList" :key="index" cols="12" sm="6" md="4" lg="3"
                            xl="2">
                            <v-card height="100%" @click="handleGetDetails(item.pageUrl)">
                                <v-img :src="item.posterUrl" :alt="item.title" height="150px" contain></v-img>
                                <v-card-title>{{ item.title }} ({{ item.year }})</v-card-title>
                                <v-card-actions>
                                    <remove-from-watch-later-button
                                        :page-url="item.pageUrl" @get-watch-later-list="getWatchLaterList"></remove-from-watch-later-button>
                                </v-card-actions>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-window-item>

                <v-window-item value="downloads">
                    <v-alert v-if="serverDownloads.length === 0" type="info" class="mt-5" prominent>
                        No active downloads
                    </v-alert>
                    <v-card v-else>
                        <v-list lines="two">
                            <v-list-item v-for="item in serverDownloads" :key="item.id" :title="item.filename">
                                <template v-slot:subtitle>
                                    <v-progress-linear :model-value="item.progress" class="my-1"></v-progress-linear>
                                    {{ formatBytes(item.loaded) }} / {{ item.total ? formatBytes(item.total) : '?' }}
                                    <span v-if="item.status === 'downloading'">({{ formatBytes(item.speed)
                                        }}/s)</span>
                                </template>

                                <template v-slot:append>
                                    <v-chip class="ml-3"
                                        :color="item.status === 'downloading' ? 'primary' : (item.status === 'completed' ? 'success' : (item.status === 'error' ? 'red' : 'grey'))"
                                        dark>{{ item.status }}</v-chip>
                                    <v-btn v-if="item.status === 'downloading'" icon="mdi-pause" variant="text"
                                        @click="pauseServerDownload(item.id)"></v-btn>
                                    <v-btn v-if="item.status === 'paused' || item.status === 'error'" icon="mdi-play"
                                        variant="text" @click="resumeServerDownload(item.id)"></v-btn>
                                    <v-btn v-if="item.status === 'downloading' || item.status === 'pending'"
                                        icon="mdi-cancel" variant="text" @click="cancelServerDownload(item.id)"></v-btn>
                                    <v-btn icon="mdi-delete" variant="text"
                                        @click="deleteServerDownload(item.id)"></v-btn>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-card>
                </v-window-item>

                <v-window-item value="settings">
                    <v-card>
                        <v-card-title>Settings</v-card-title>
                        <v-card-text>
                            <v-text-field v-for="config in configs" :key="config.key" v-model="config.value"
                                :label="config.key || 'N/A'" :hint="config.description" persistent-hint></v-text-field>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn color="primary" variant="outlined" @click="saveConfig">Save</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-window-item>
            </v-window>
        </v-container>
        <details-modal :url="modal.url" :item="modal.item" :watchLaterList="watchLaterList" @get-details="handleGetDetails" @get-watch-later-list="getWatchLaterList"></details-modal>
    </v-app>
</template>
