import "video.js/dist/video-js.css";
import "video.js/dist/video.js";

import { defineComponent } from "vue";
import * as bootstrap from "bootstrap";

import { showWarningDialog, showSuccessDialog } from "../utils/dialogs";

import { StreamDropdown, SectionWithButtons, LoadingOverlay } from "./";

import { api } from "../api";

export default defineComponent({
  name: "DetailsModal",
  emits: ["get-details", "add-to-watch-later"],
  components: {
    StreamDropdown,
    SectionWithButtons,
    LoadingOverlay,
  },
  props: {
    item: {
      type: Object,
      default: null,
    },
    url: {
      type: String,
      default: null,
    },
  },
  watch: {
    item: {
      immediate: true,
      handler(newItem) {
        if (!newItem) {
          return;
        }
        this.resetPlayer();
        this.show();
      },
    },
  },
  data() {
    return {
      instance: null as bootstrap.Modal | null,

      videoUrl: null as string | null,

      loading: false,

      download: {
        progress: 0,
        loaded: 0,
        total: 0,
        speed: 0,
        controller: new AbortController(),
        reset() {
          this.progress = 0;
          this.loaded = 0;
          this.total = 0;
          this.speed = 0;
          this.controller = new AbortController();
        },
      },
    };
  },
  mounted() {
    // Initialize Bootstrap modal
    const modalEl = this.$refs.modalRef as HTMLElement;
    modalEl.addEventListener("hidden.bs.modal", () => {
      this.resetPlayer(); // Stop video when modal closes
    });

    this.instance = new bootstrap.Modal(modalEl);
  },
  computed: {
    isAndroid(): boolean {
      return /android/i.test(navigator.userAgent);
    },
  },
  methods: {
    getDetails(item: any) {
      this.$emit("get-details", item);
    },
    addToWatchLater(item: any) {
      this.$emit("add-to-watch-later", item);
    },
    show() {
      this.instance?.show();
    },
    hide() {
      this.instance?.hide();
    },
    showPlayer(url: string) {
      this.videoUrl = null;

      setTimeout(() => {
        this.videoUrl = url;
      }, 100);
    },
    hidePlayer() {
      this.resetPlayer();
    },
    resetPlayer() {
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
    async downloadToLocal(url: string, filename: string) {
      this.loading = true; // TODO:

      this.download.reset();
      try {
        const response = await fetch(url, {
          signal: this.download.controller.signal,
        });
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }

        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        this.download.total = total;
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
          this.download.loaded = loaded;
          if (total) {
            this.download.progress = Math.round((loaded / total) * 100);
          }

          const now = Date.now();
          if (now - lastTime >= 500) {
            this.download.speed =
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
        this.loading = false; // TODO:

        this.download.reset();
      }
    },
    cancelLocalDownload() {
      this.download.controller.abort();
    },
    async downloadToServer(url: string, filename: string) {
      showWarningDialog(
        "Download to Server",
        `${filename} will be downloaded to server.`
      ).then(async (isConfirmed) => {
        if (isConfirmed) {
          const payload = {
            url: url,
            filename: filename,
          } as object;

          await api.downloadToServer(payload);

          showSuccessDialog("Download started on server!");
        }
      });
    },
    async cancelServerDownload(id: string) {
      showWarningDialog(
        "Are you sure?",
        "You won't be able to revert this!"
      ).then(async (isConfirmed) => {
        if (isConfirmed) {
          await api.cancelServerDownload(id);
        }
      });
    },
    async pauseServerDownload(id: string) {
      await api.pauseServerDownload(id);
    },
    async resumeServerDownload(id: string) {
      await api.resumeServerDownload(id);
    },
    async deleteServerDownload(id: string) {
      showWarningDialog(
        "Are you sure?",
        "Are you sure you want to delete this download task?"
      ).then(async (isConfirmed) => {
        if (isConfirmed) {
          showWarningDialog(
            "Are you sure?",
            "Do you also want to delete the file from the disk?"
          ).then(async (isConfirmed) => {
            if (isConfirmed) {
              await api.deleteServerDownload(id, isConfirmed);
            }
          });
        }
      });
    },
  },
  template: `
    <loading-overlay :loading="loading" :progress="download.progress" :loaded="download.loaded" :total="download.total" :speed="download.speed" @cancel-local-download="cancelLocalDownload"></loading-overlay>
    <div class="modal fade" id="detailModal" tabindex="-1" aria-hidden="true" ref="modalRef">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content" v-if="item">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <a :href="url" target="_blank">{{ item.titleOriginal || item.title
                            }}</a>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row mb-3">
                        <div class="col-md-4 text-center" v-if="item.posterUrl">
                            <img class="img-fluid" style="max-height: 250px;" :src="item.posterUrl" :alt="item.title">
                            <button class="btn btn-outline-primary mt-2" @click="addToWatchLater(item)">Add to Watch
                                Later</button>
                        </div>
                        <div :class="item.posterUrl ? 'col-md-8' : 'col-12'">
                            <!-- Translations -->
                            <section-with-buttons title="Translations" :items="item.translations"
                                @get-details="getDetails"></section-with-buttons>
                        </div>
                    </div>

                    <!-- Seasons -->
                    <section-with-buttons title="Seasons" :items="item.seasons" replace-from="Сезон"
                        replace-to="Season" @get-details="getDetails"></section-with-buttons>

                    <!-- Episodes -->
                    <section-with-buttons title="Episodes" :items="item.episodes" replace-from="Серия"
                        replace-to="Episode" @get-details="getDetails"></section-with-buttons>

                    <!-- Actions -->
                    <div v-if="item.streams && item.streams.length">
                        <h6>Actions</h6>
                        <stream-dropdown label="Watch" :streams="item.streams"
                            @select="showPlayer($event.mp4)"></stream-dropdown>

                        <stream-dropdown v-if="isAndroid" label="Watch External" :streams="item.streams"
                            @select="openStream($event.mp4Android)"></stream-dropdown>

                        <stream-dropdown label="Open in Tab" :streams="item.streams"
                            @select="openStream($event.mp4)"></stream-dropdown>

                        <stream-dropdown label="Copy Url" :streams="item.streams"
                            @select="copyStreamUrl($event.mp4)"></stream-dropdown>

                        <stream-dropdown label="Download" :streams="item.streams"
                            @select="downloadToLocal($event.mp4, $event.mp4FileName)"></stream-dropdown>

                        <stream-dropdown label="Download Season" :streams="item.streams"></stream-dropdown>

                        <stream-dropdown label="Download To Server" :streams="item.streams"
                            @select="downloadToServer($event.mp4, $event.mp4FileName)"></stream-dropdown>

                        <stream-dropdown label="Download Season To Server"
                            :streams="item.streams"></stream-dropdown>
                    </div>

                    <!-- Video Player -->
                    <div v-if="videoUrl" class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0">Video</h6>
                            <button class="btn btn-sm btn-danger" @click="hidePlayer()" aria-label="Close Player">Close Player</button>
                        </div>
                        <div class="ratio bg-dark rounded overflow-hidden">
                            <video id="my-video" class="video-js vjs-default-skin" controls
                                preload="auto" width="640" height="264" poster="" data-setup="{}">
                                <source :src="videoUrl" type="video/mp4" />
                                <p class="vjs-no-js">
                                    To view this video please enable JavaScript, and consider upgrading to a
                                    web browser that
                                    <a href="videojs.com" target="_blank">supports HTML5 video</a>
                                </p>
                            </video>
                        </div>
                    </div>

                    <!-- RAW JSON -->
                    <div>
                        <p class="d-inline-flex gap-1">
                            <a class="btn btn-outline-success" data-bs-toggle="collapse" href="#json-collapse"
                                role="button" aria-expanded="false" aria-controls="json-collapse">
                                RAW JSON
                            </a>
                        </p>
                        <div class="collapse" id="json-collapse">
                            <div style="white-space: pre;
                            font-family: monospace;
                            background: #f5f5f5;
                            padding: 10px;
                            border-radius: 6px;">
                                {{ JSON.stringify(item, null, 2) }}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  `,
});
