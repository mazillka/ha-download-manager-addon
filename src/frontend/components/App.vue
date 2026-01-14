<script lang="ts">
import { defineComponent } from "vue";
import {
    LoadingOverlay,
    DetailsModal,
    AddToWatchLaterButton,
    RemoveFromWatchLaterButton,
} from ".";
import {
    Config,
    DownloadTask,
    ParseResult,
    SearchResult,
    WatchLater,
} from "../../common/interfaces";
import { api, subscribeLoading } from "../api";
import { formatBytes } from "../utils/format";
import { showWarningDialog } from "../utils/dialogs";
import { ConfigKey } from "../../common/enums";

export default defineComponent({
    name: "App",
    components: {
        LoadingOverlay,
        DetailsModal,
        AddToWatchLaterButton,
        RemoveFromWatchLaterButton
    },
    data() {
        return {
            isLoading: false,
            query: "",
            searchResults: [] as SearchResult[],

            modal: {
                item: null as ParseResult | null,
                url: null as string | null,
                init(data: ParseResult, url: string) {
                    this.item = data;
                    this.url = url;
                },
            },

            serverPollInterval: null as number | null,
            activeTab: "search",

            tabs: [
                { id: "search", name: "Search" },
                { id: "watching", name: "Watching Now" },
                { id: "latest", name: "Latest arrivals" },
                { id: "popular", name: "Popular" },
                { id: "downloads", name: "Downloads" },
                { id: "watch_later", name: "Watch Later" },
                { id: "settings", name: "Settings" },
            ],
            tabUrls: {
                watching: "?filter=watching",
                popular: "?filter=popular",
                latest: "?filter=last",
            } as Record<string, string>,

            configs: [] as Config[],
            serverDownloads: [] as any[],
            watchLaterList: [] as WatchLater[],
        };
    },
    mounted() {
        subscribeLoading((v) => (this.isLoading = v));

        this.getConfigs();
        this.getServerDownloads();
        this.getWatchLaterList();

        this.serverPollInterval = window.setInterval(async () => {
            await Promise.all([this.getServerDownloads(), this.getWatchLaterList()]);
        }, 3000);
    },
    computed: {
        activeServerDownloads(): number {
            return this.serverDownloads.filter(
                (x: any) => x.status === "downloading" || x.status === "pending"
            ).length;
        },

        watchLaterCount(): number {
            return this.watchLaterList.length;
        },

        baseUrl(): string {
            return (
                this.configs.find((x: any) => x.key === ConfigKey.BaseUrl)?.value || ""
            );
        },
    },
    methods: {
        formatBytes,

        async onSelectTab(tabId: string) {
            this.activeTab = tabId;
            this.query = "";
            this.searchResults = [];

            if (tabId === "search") return;
            if (tabId === "settings") return this.getConfigs();
            if (tabId === "watch_later") return this.getWatchLaterList();

            const filter = this.tabUrls[tabId];
            if (filter) {
                await this.getSearchResults(`${this.baseUrl}/${filter}`);
            }
        },

        async onSearch() {
            if (!this.query) return;

            const searchUrl = `${this.baseUrl
                }/search/?do=search&subaction=search&q=${encodeURIComponent(this.query)}`;
            await this.getSearchResults(searchUrl);
        },

        async onClear() {
            this.query = "";
            this.searchResults = [];
        },

        async getSearchResults(url: string) {
            const { list } = await api.getSearchResults(url);
            this.searchResults = list;
        },

        async getDetails(url: string, data_translator_id?: string | null) {
            const { details } = await api.getDetails({ url, data_translator_id });
            this.modal.init(details, url);
        },

        async getConfigs() {
            const { list } = await api.getConfigs();
            this.configs = list;
        },

        async saveConfig() {
            await api.saveConfigs(this.configs);
        },

        async getServerDownloads() {
            const { list } = await api.getServerDownloads();
            this.serverDownloads = list;
        },

        async getWatchLaterList() {
            const { list } = await api.getWatchLater();
            this.watchLaterList = list;
        },

        async cancelServerDownload(id: string) {
            const isConfirmed = await showWarningDialog(
                "Are you sure?",
                "You won't be able to revert this!"
            );

            if (!isConfirmed) return;

            await api.cancelServerDownload(id);
        },

        async pauseServerDownload(id: string) {
            await api.pauseServerDownload(id);
        },

        async resumeServerDownload(id: string) {
            await api.resumeServerDownload(id);
        },

        async deleteServerDownload(id: string) {
            const isConfirmed1 = await showWarningDialog(
                "Are you sure?",
                "You want to delete this task?"
            );

            if (!isConfirmed1) return;

            const isConfirmed2 = await showWarningDialog(
                "Are you sure?",
                "Also delete file from disk?"
            );

            if (!isConfirmed2) return;

            await api.deleteServerDownload(id, isConfirmed2);
        },

        async handleGetDetails(
            t: string | { url?: string; data_translator_id?: string }
        ) {
            if (typeof t === "string") {
                await this.getDetails(t);
            } else if (t.url) {
                await this.getDetails(t.url);
            } else {
                await this.getDetails(this.modal.url!, t.data_translator_id);
            }
        },
    },
});
</script>

<style>
.card {
    cursor: pointer;
    transition: transform 0.2s;
}

.card:hover {
    transform: scale(1.02);
}

[v-cloak] {
    display: none;
}

@import "bootstrap/dist/css/bootstrap.min.css";
</style>

<template>

    <!-- Loading Overlay -->
    <loading-overlay :loading="isLoading"></loading-overlay>

    <!-- Navbar -->
    <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <!-- Tabs -->
            <ul class="nav nav-tabs mb-0">
                <li class="nav-item" v-for="tab in tabs" :key="tab.id">
                    <button class="nav-link" :class="{ active: activeTab === tab.id }" @click="onSelectTab(tab.id)">
                        {{ tab.name }}
                        <span v-if="tab.id === 'downloads' && activeServerDownloads > 0"
                            class="badge bg-danger ms-1 rounded-pill">
                            {{ activeServerDownloads }}
                        </span>
                        <span v-if="tab.id === 'watch_later' && watchLaterCount > 0"
                            class="badge bg-danger ms-1 rounded-pill">
                            {{ watchLaterCount }}
                        </span>
                    </button>
                </li>
            </ul>
        </div>

        <!-- Search -->
        <div class="row mb-4" v-if="activeTab === 'search'">
            <div class="col-12">
                <div class="input-group">
                    <input type="text" class="form-control" placeholder="Search..." v-model="query"
                        @keyup.enter="onSearch">
                    <button class="btn btn-success" @click="onSearch" :disabled="isLoading">Search</button>
                    <button class="btn btn-secondary" @click="onClear" :disabled="isLoading">Clear</button>
                </div>
            </div>
        </div>

        <!-- Search Results -->
        <div class="row g-4" id="cards-row"
            v-if="activeTab === 'search' || activeTab === 'watching' || activeTab === 'latest' || activeTab === 'popular'">
            <div v-for="(item, index) in searchResults" :key="index"
                class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 d-flex">
                <div class="card h-100 w-100 d-flex flex-column" @click="handleGetDetails(item.pageUrl)">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">{{ item.title }}</h5>
                        <div class="mt-auto d-flex justify-content-center">
                            <div style="max-height:150px; display:flex; align-items:flex-end; position: relative;">
                                <img :src="item.posterUrl" :alt="item.title" class="img-fluid"
                                    style="max-width:100%; max-height:100%;">
                                <span v-if="item.category"
                                    class="badge bg-primary position-absolute top-0 end-0 rounded-0 opacity-75">
                                    {{ item.category.replace("Сериал", "Show").replace("Фильм",
                                        "Movie").replace("Аниме", "Anime").replace("Мультфильм", "Cartoon") }}
                                </span>
                            </div>
                        </div>

                        <add-to-watch-later-button :title="item.title" :page-url="item.pageUrl"
                            :poster-url="item.posterUrl"></add-to-watch-later-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Watch Later -->
        <div class="row g-4" v-if="activeTab === 'watch_later'">
            <div v-if="!watchLaterList || watchLaterList.length === 0" class="col-12 text-center text-muted mt-5">No
                items in Watch Later</div>
            <div v-for="(item, index) in watchLaterList" :key="index"
                class="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 d-flex">
                <div class="card h-100 w-100 d-flex flex-column" @click="handleGetDetails(item.pageUrl)">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">{{ item.title }}</h5>
                        <div class="mt-auto d-flex justify-content-center">
                            <div style="max-height:150px; display:flex; align-items:flex-end; position: relative;">
                                <img :src="item.posterUrl" :alt="item.title" class="img-fluid"
                                    style="max-width:100%; max-height:100%;">
                            </div>
                        </div>

                        <remove-from-watch-later-button :page-url="item.pageUrl"></remove-from-watch-later-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Server Downloads -->
        <div v-if="activeTab === 'downloads'" class="mt-4">
            <div v-if="serverDownloads.length === 0" class="text-center text-muted mt-5">No active downloads</div>
            <div v-else class="card">
                <div class="card-body">
                    <div v-for="item in serverDownloads" :key="item.id" class="mb-3 border-bottom pb-2">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <div class="text-truncate me-2" :title="item.filename"><strong>{{ item.filename
                            }}</strong></div>
                            <div>
                                <span class="badge"
                                    :class="{ 'bg-primary': item.status === 'downloading', 'bg-success': item.status === 'completed', 'bg-danger': item.status === 'error', 'bg-secondary': item.status === 'pending' }">{{
                                        item.status }}</span>
                            </div>
                        </div>
                        <div class="progress mb-1" style="height: 10px;">
                            <div class="progress-bar" role="progressbar" :style="{ width: item.progress + '%' }">
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center small text-muted">
                            <div>
                                {{ formatBytes(item.loaded) }} / {{ item.total ? formatBytes(item.total) : '?' }}
                                <span v-if="item.status === 'downloading'">({{ formatBytes(item.speed) }}/s)</span>
                            </div>
                            <div>
                                <button v-if="item.status === 'downloading'" class="btn btn-sm btn-warning py-0 me-1"
                                    @click="pauseServerDownload(item.id)">Pause</button>
                                <button v-if="item.status === 'paused' || item.status === 'error'"
                                    class="btn btn-sm btn-success py-0 me-1"
                                    @click="resumeServerDownload(item.id)">Resume</button>
                                <button v-if="item.status === 'downloading' || item.status === 'pending'"
                                    class="btn btn-sm btn-secondary py-0 me-1"
                                    @click="cancelServerDownload(item.id)">Cancel</button>
                                <button class="btn btn-sm btn-danger py-0"
                                    @click="deleteServerDownload(item.id)">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Settings -->
        <div v-if="activeTab === 'settings'" class="mt-4">
            <div class="card">
                <div class="card-header">Settings</div>
                <div class="card-body">
                    <div class="mb-3" v-for="config in configs" :key="config.key">
                        <label :for="config.key || ''" class="form-label">{{ config.value }}</label>
                        <input type="text" class="form-control" :id="config.key || ''" v-model="config.value">
                        <div class="form-text" v-if="config.description">{{ config.description }}</div>
                    </div>
                    <button class="btn btn-primary" @click="saveConfig">Save</button>
                </div>
            </div>
        </div>
    </div>

    <details-modal :url="modal.url" :item="modal.item" @get-details="handleGetDetails"></details-modal>
</template>