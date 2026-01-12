import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "video.js/dist/video-js.css";

import "video.js/dist/video.js";
import Swal from "sweetalert2";
import { createApp, defineComponent } from "vue";
import type { DownloadTask, Tab } from "./interfaces/";
import {
  StreamDropdown,
  SectionWithButtons,
  LoadingOverlay,
  DetailsModal,
} from "./components/";
import type { Config, WatchLater } from "../common/interfaces";
import { ConfigKey } from "../common/enums";
import { formatBytes } from "./utils/format";

import { api } from "./api";

const App = defineComponent({
  data() {
    return {
      query: "",
      results: [] as any[],
      loading: false,

      modal: {
        item: null as any,
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
    this.getConfigs();
    this.getServerDownloads();
    this.getWatchLaterList();
    this.serverPollInterval = window.setInterval(async () => {
      await Promise.all([this.getServerDownloads(), this.getWatchLaterList()]);
    }, 3000);
  },
  methods: {
    formatBytes,
    async getConfigs() {
      try {
        const { configs } = await api.getConfigs();
        this.configs = configs;
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    },
    async saveConfig() {
      try {
        await api.saveConfigs(this.configs);
      } catch (error) {
        console.error(`Error: ${error}`);
      }

      // await fetch("api/configs", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ configs: this.configs }),
      // })
      //   .then(async (response) => {
      //     if (!response.ok) {
      //       throw new Error("HTTP error " + response.status);
      //     }

      //     setTimeout(async () => {
      //       await this.getConfigs();
      //     }, 1000);

      //     Swal.fire({
      //       icon: "success",
      //       title: "Settings saved",
      //       showConfirmButton: false,
      //       timer: 1500,
      //     });
      //   })
      //   .catch((error) => {
      //     console.error("Error:", error);
      //     Swal.fire({
      //       icon: "error",
      //       title: "Error saving settings",
      //       text: error.message,
      //     });
      //   });
    },
    async selectTab(tabId: string) {
      this.activeTab = tabId;
      this.results = [];

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
        await this.getList(`${this.baseUrl}/${filter}`);
      }
    },
    async getList(url: string) {
      this.loading = true;
      this.results = [];

      await fetch("api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }

          return response.json();
        })
        .then((data: any) => {
          this.results = data;
        })
        .catch((error) => {
          console.error("Error:", error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    async search() {
      if (!this.query) {
        return;
      }
      const searchUrl = `${
        this.baseUrl
      }/search/?do=search&subaction=search&q=${encodeURIComponent(this.query)}`;
      await this.getList(searchUrl);
    },
    async clear() {
      this.query = "";
      this.results = [];
    },
    async getDetails(url: string, data_translator_id?: string | null) {
      this.loading = true;
      await fetch("api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url,
          data_translator_id: data_translator_id,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          return response.json();
        })
        .then((data: any) => {
          this.modal.init(data, url);
          // this.modal.show();
        })
        .catch((error) => {
          console.error("Error:", error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    async getServerDownloads() {
      await fetch("api/downloads")
        .then((response) => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          return response.json();
        })
        .then((data: DownloadTask[]) => {
          this.serverDownloads = data;
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    },
    async getWatchLaterList() {
      // this.loading = true;
      await fetch("api/watchLater")
        .then((response) => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          return response.json();
        })
        .then((data: WatchLater[]) => {
          this.watchLaterList = data;
        })
        .catch((error) => {
          console.error("Error:", error);
        });
      // .finally(() => {
      //   this.loading = false;
      // });
    },
    async addToWatchLater(item: any) {
      const payload: WatchLater = {
        title: item.title,
        pageUrl: item.pageUrl || this.modal.url || "",
        posterUrl: item.posterUrl,
      };

      await fetch("api/watchLater", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          if (!response.ok) throw new Error("HTTP error " + response.status);
          Swal.fire({
            icon: "success",
            title: "Added to Watch Later",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch((error) => {
          console.error("Error:", error);
          Swal.fire({
            icon: "error",
            title: "Error saving to Watch Later",
            text: error.message,
          });
        });
    },
    async removeFromWatchLater(pageUrl: string) {
      Swal.fire({
        title: "Are you sure?",
        text: "Remove from Watch Later?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        customClass: {
          confirmButton: "btn btn-success",
          cancelButton: "btn btn-danger",
        },
      }).then(async (result: any) => {
        if (result.isConfirmed) {
          try {
            await fetch(`api/watchLater`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageUrl: pageUrl,
              }),
            });
            this.getWatchLaterList();
          } catch (error) {
            console.error("Error:", error);
          }
        }
      });
    },
    handleGetDetails(
      t: string | { url?: string; data_translator_id?: string }
    ) {
      if (typeof t === "string") {
        this.getDetails(t);
      } else {
        if (t.url) {
          this.getDetails(t.url);
        } else {
          this.getDetails(this.modal.url!, t.data_translator_id);
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
