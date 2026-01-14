import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { createApp, defineComponent } from "vue";
import type { DownloadTask, Tab } from "./interfaces/";
import {
  StreamDropdown,
  SectionWithButtons,
  LoadingOverlay,
  DetailsModal,
} from "./components/";
import type {
  Config,
  ParseResult,
  SearchResult,
  WatchLater,
} from "../common/interfaces";
import { ConfigKey } from "../common/enums";
import { formatBytes } from "./utils/format";
import { showWarningDialog, showSuccessDialog } from "./utils/dialogs";
import { api, subscribeLoading } from "./api";

const App = defineComponent({
  data() {
    return {
      isLoading: false,
      query: "",
      searchResults: [] as SearchResult[],

      modal: {
        item: null as ParseResult | null,
        url: null as string | null,

        init(data: any, url: string) {
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
      ] as Tab[],

      tabUrls: {
        watching: "?filter=watching",
        popular: "?filter=popular",
        latest: "?filter=last",
      } as Record<string, string>,

      configs: [] as Config[],
      serverDownloads: [] as DownloadTask[],
      watchLaterList: [] as WatchLater[],
    };
  },
  computed: {
    activeServerDownloads(): number {
      return this.serverDownloads.filter(
        (x) => x.status === "downloading" || x.status === "pending"
      ).length;
    },
    watchLaterCount(): number {
      return this.watchLaterList.length;
    },
    baseUrl(): string {
      return this.configs.find((x) => x.key === ConfigKey.BaseUrl)?.value || "";
    },
  },
  mounted() {
    subscribeLoading((v) => {
      this.isLoading = v;
    });

    this.getConfigs();
    this.getServerDownloads();
    this.getWatchLaterList();
    this.serverPollInterval = window.setInterval(async () => {
      await Promise.all([this.getServerDownloads(), this.getWatchLaterList()]);
    }, 3000);
  },
  methods: {
    formatBytes,
    async onSelectTab(tabId: string) {
      this.activeTab = tabId;
      this.query = "";
      this.searchResults = [];

      if (tabId === "search") {
        return;
      }

      if (tabId === "settings") {
        await this.getConfigs();
        return;
      }

      if (tabId === "watch_later") {
        await this.getWatchLaterList();
        return;
      }

      const filter = this.tabUrls[tabId];
      if (filter) {
        await this.getSearchResults(`${this.baseUrl}/${filter}`);
      }
    },
    async onSearch() {
      if (!this.query) {
        return;
      }
      const searchUrl = `${
        this.baseUrl
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
      const payload = {
        url: url,
        data_translator_id: data_translator_id,
      } as object;

      const { details } = await api.getDetails(payload);

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
    async addToWatchLater(item: any) {
      const payload = {
        title: item.title,
        pageUrl: item.pageUrl || this.modal.url || "",
        posterUrl: item.posterUrl,
      } as object;

      await api.addWatchLater(payload);

      showSuccessDialog("Added to Watch Later");
    },
    async removeFromWatchLater(pageUrl: string) {
      showWarningDialog("Are you sure?", "Remove from Watch Later?").then(
        async (isConfirmed) => {
          if (isConfirmed) {
            await api.deleteWatchLater(pageUrl);

            this.getWatchLaterList();
          }
        }
      );
    },
    async handleGetDetails(
      t: string | { url?: string; data_translator_id?: string }
    ) {
      if (typeof t === "string") {
        await this.getDetails(t);
      } else {
        if (t.url) {
          await this.getDetails(t.url);
        } else {
          await this.getDetails(this.modal.url!, t.data_translator_id);
        }
      }
    },
  },
});

const app = createApp(App);
app.component("stream-dropdown", StreamDropdown);
app.component("section-with-buttons", SectionWithButtons);
app.component("loading-overlay", LoadingOverlay);
app.component("details-modal", DetailsModal);
app.mount("#app");
