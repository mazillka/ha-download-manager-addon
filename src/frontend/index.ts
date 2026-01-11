import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "video.js/dist/video-js.css";

import "video.js/dist/video.js";
import * as bootstrap from "bootstrap";
import Swal from "sweetalert2";
import { createApp, defineComponent } from "vue";
import type { DownloadTask, Tab } from "./interfaces/";
import {
  StreamDropdown,
  SectionWithButtons,
  LoadingOverlay,
} from "./components/";
import type { Config } from "../common/interfaces";
import { ConfigKey } from "../common/enums";

import { api } from "./api";

let modalInstance: any = null;

const TAB_URLS: Record<string, string> = {
  watching: "?filter=watching",
  popular: "?filter=popular",
  latest: "?filter=last",
};

interface WatchLater {
  title: string;
  pageUrl: string;
  posterUrl: string;
}

const App = defineComponent({
  data() {
    return {
      query: "",
      results: [] as any[],
      loading: false,
      downloadProgress: 0,
      downloadLoaded: 0,
      downloadTotal: 0,
      downloadSpeed: 0,
      downloadController: null as AbortController | null,
      selectedItem: null as any,
      selectedUrl: null as string | null,
      videoUrl: null as string | null,
      serverDownloads: [] as DownloadTask[],
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
      configs: [] as Config[],
      watchLaterList: [] as WatchLater[],
    };
  },
  computed: {
    isAndroid(): boolean {
      return /android/i.test(navigator.userAgent);
    },
    activeServerDownloads(): number {
      return this.serverDownloads.filter(
        (d) => d.status === "downloading" || d.status === "pending"
      ).length;
    },
    baseUrl(): string {
      return this.configs.find((x) => x.key === ConfigKey.BaseUrl)?.value || "";
    },
  },
  mounted() {
    // Initialize Bootstrap modal
    const modalEl = this.$refs.modalRef as HTMLElement;
    modalInstance = new bootstrap.Modal(modalEl);

    modalEl.addEventListener("hidden.bs.modal", () => {
      this.videoUrl = null; // Stop video when modal closes
    });

    this.getConfigs();
    this.getServerDownloads();
    this.serverPollInterval = window.setInterval(
      () => this.getServerDownloads(),
      1000
    );
  },
  methods: {
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

      const filter = TAB_URLS[tabId];
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
    async parse(
      url: string,
      data_id?: string | null,
      data_translator_id?: string | null
    ) {
      this.loading = true;
      await fetch("api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url,
          data_id: data_id,
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
          this.selectedItem = data;

          this.selectedUrl = url;
          this.videoUrl = null; // Reset video player
          modalInstance.show();
        })
        .catch((error) => {
          console.error("Error:", error);
        })
        .finally(() => {
          this.loading = false;
        });
    },
    showPlayer(url: string) {
      this.videoUrl = null;

      setTimeout(() => {
        this.videoUrl = url;
      }, 100);
    },
    hidePlayer() {
      this.videoUrl = null;
    },
    openStream(url: string) {
      window.open(url, "_blank");
    },
    copyStreamUrl(url: string) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
    },
    formatBytes(bytes: number, decimals = 2) {
      if (!+bytes) {
        return "0 Bytes";
      }
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
    async download(url: string, filename: string) {
      this.loading = true;
      this.downloadController = new AbortController();
      this.downloadProgress = 0;
      this.downloadLoaded = 0;
      this.downloadTotal = 0;
      this.downloadSpeed = 0;

      try {
        const response = await fetch(url, {
          signal: this.downloadController.signal,
        });
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }

        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        this.downloadTotal = total;
        let loaded = 0;
        let lastLoaded = 0;
        let lastTime = Date.now();

        const reader = response.body!.getReader();
        const chunks = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          chunks.push(value);
          loaded += value.length;
          this.downloadLoaded = loaded;
          if (total) {
            this.downloadProgress = Math.round((loaded / total) * 100);
          }

          const now = Date.now();
          if (now - lastTime >= 500) {
            this.downloadSpeed =
              (loaded - lastLoaded) / ((now - lastTime) / 1000);
            lastLoaded = loaded;
            lastTime = now;
          }
        }

        const blob = new Blob(chunks);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("Download cancelled");
        } else {
          console.error("Error:", error);
        }
      } finally {
        this.loading = false;
        this.downloadController = null;
        this.downloadProgress = 0;
        this.downloadLoaded = 0;
        this.downloadTotal = 0;
        this.downloadSpeed = 0;
      }
    },
    cancelDownload() {
      if (this.downloadController) {
        this.downloadController.abort();
      }
    },
    async downloadToServer(url: string, filename: string) {
      Swal.fire({
        title: "Are you sure?",
        text: `${filename} will be downloaded to server.`,
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
            await fetch("api/download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url, filename }),
            });
            this.getServerDownloads(); // Update count

            Swal.fire({
              title: "Download started on server!",
              icon: "success",
              customClass: {
                confirmButton: "btn btn-success",
                cancelButton: "btn btn-danger",
              },
            });
          } catch (error) {
            console.error("Error:", error);
            Swal.fire({
              title: "Failed to start download",
              customClass: {
                confirmButton: "btn btn-success",
              },
            });
          }
        }
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
    async cancelServerDownload(id: string) {
      Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
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
            await fetch(`api/downloads/${id}/cancel`, { method: "POST" });
            this.getServerDownloads();
          } catch (error) {
            console.error("Error:", error);
          }
        }
      });
    },
    async pauseServerDownload(id: string) {
      try {
        await fetch(`api/downloads/${id}/pause`, { method: "POST" });
        this.getServerDownloads();
      } catch (error) {
        console.error("Error:", error);
      }
    },
    async resumeServerDownload(id: string) {
      try {
        await fetch(`api/downloads/${id}/resume`, { method: "POST" });
        this.getServerDownloads();
      } catch (error) {
        console.error("Error:", error);
      }
    },
    async deleteServerDownload(id: string) {
      Swal.fire({
        title: "Are you sure?",
        text: "Are you sure you want to delete this download task?",
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
          Swal.fire({
            title: "Are you sure?",
            text: "Do you also want to delete the file from the disk?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes",
            cancelButtonText: "No",
            customClass: {
              confirmButton: "btn btn-success",
              cancelButton: "btn btn-danger",
            },
          }).then(async (result: any) => {
            try {
              await fetch(
                `api/downloads/${id}?removeFile=${result.isConfirmed}`,
                { method: "DELETE" }
              );
              this.getServerDownloads();
            } catch (error) {
              console.error("Error:", error);
            }
          });
        }
      });
    },
    async getWatchLaterList() {
      this.loading = true;
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
        })
        .finally(() => {
          this.loading = false;
        });
    },
    async addToWatchLater(item: any) {
      const payload: WatchLater = {
        title: item.title,
        pageUrl: item.pageUrl || this.selectedUrl || "",
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
    handleParse(t: any) {
      if (t.url) {
        this.parse(t.url);
      } else {
        this.parse(this.selectedUrl!, t.data_id, t.data_translator_id);
      }
    },
  },
});

const app = createApp(App);
app.component("stream-dropdown", StreamDropdown);
app.component("section-with-buttons", SectionWithButtons);
app.component("loading-overlay", LoadingOverlay);
app.mount("#app");
