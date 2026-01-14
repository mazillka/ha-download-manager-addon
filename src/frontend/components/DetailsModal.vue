<script setup lang="ts">
import "video.js/dist/video-js.css";
import "video.js/dist/video.js";

import * as bootstrap from "bootstrap";

import { ref, watch, computed, onMounted } from "vue";

import { showWarningDialog, showSuccessDialog } from "../utils/dialogs";
import { api } from "../api";

import type { ParseResult } from "../../common/interfaces";

// Components
import { StreamDropdown, SectionWithButtons, LoadingOverlay, AddToWatchLaterButton } from "./";

// -------------------- Props & Emits --------------------
const props = defineProps<{
  item: ParseResult | null;
  url: string | null;
}>();

const emit = defineEmits<{
  (e: "get-details", item: any): void;
}>();

// -------------------- Refs --------------------
const modalRef = ref<HTMLElement | null>(null);
const instance = ref<bootstrap.Modal | null>(null);

const videoUrl = ref<string | null>(null);
const loading = ref(false);

const download = ref({
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
});

// -------------------- Watchers --------------------
watch(
  () => props.item,
  (newItem) => {
    if (!newItem) return;
    resetPlayer();
    show();
  },
  { immediate: true }
);

// -------------------- Computed --------------------
const isAndroid = computed(() => /android/i.test(navigator.userAgent));

// -------------------- Lifecycle --------------------
onMounted(() => {
  if (!modalRef.value) return;

  modalRef.value.addEventListener("hidden.bs.modal", () => {
    resetPlayer();
  });

  instance.value = new bootstrap.Modal(modalRef.value);
});

// -------------------- Methods --------------------
function getDetails(item: any) {
  emit("get-details", item);
}

function show() {
  instance.value?.show();
}

function hide() {
  instance.value?.hide();
}

function showPlayer(url: string) {
  videoUrl.value = null;
  setTimeout(() => {
    videoUrl.value = url;
  }, 100);
}

function hidePlayer() {
  resetPlayer();
}

function resetPlayer() {
  videoUrl.value = null;
}

function openStream(url: string | undefined | null) {
  if (!url)
    return;

  window.open(url, "_blank");
}

function copyStreamUrl(url: string) {
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
}

async function downloadToLocal(url: string, filename: string | undefined | null) {
  if (!url || !filename) {
    return;
  }


  loading.value = true;
  download.value.reset();

  try {
    const response = await fetch(url, { signal: download.value.controller.signal });
    if (!response.ok) throw new Error("HTTP error " + response.status);

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    download.value.total = total;

    let loaded = 0;
    let lastLoaded = 0;
    let lastTime = Date.now();

    const reader = response.body!.getReader();
    const chunks: BlobPart[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;
      download.value.loaded = loaded;
      if (total) download.value.progress = Math.round((loaded / total) * 100);

      const now = Date.now();
      if (now - lastTime >= 500) {
        download.value.speed = (loaded - lastLoaded) / ((now - lastTime) / 1000);
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
    if (error.name === "AbortError") console.log("Download cancelled");
    else console.error("Error:", error);
  } finally {
    loading.value = false;
    download.value.reset();
  }
}

function cancelLocalDownload() {
  download.value.controller.abort();
}

async function downloadToServer(url: string, filename: string | undefined | null) {
  if (!url || !filename) {
    return;
  }

  const isConfirmed = await showWarningDialog(
    "Download to Server",
    `${filename} will be downloaded to server.`
  );
  if (!isConfirmed) return;

  const payload = { url, filename };
  await api.downloadToServer(payload);
  showSuccessDialog("Download started on server!");
}
</script>

<template>
  <loading-overlay :loading="loading" :progress="download.progress" :loaded="download.loaded" :total="download.total"
    :speed="download.speed" @cancel-local-download="cancelLocalDownload" />

  <div class="modal fade" id="detailModal" tabindex="-1" aria-hidden="true" ref="modalRef">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content" v-if="props.item">
        <div class="modal-header">
          <h5 class="modal-title">
            <a :href="props.url || '#'" target="_blank">{{ props.item.titleOriginal || props.item.title }}</a>
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <div class="row mb-3">
            <div class="col-md-4 text-center" v-if="props.item.posterUrl">
              <img class="img-fluid" style="max-height: 250px;" :src="props.item.posterUrl" :alt="props.item.title" />
              <add-to-watch-later-button :title="props.item.titleOriginal || props.item.title" :page-url="props.url || '#'"
                :poster-url="props.item.posterUrl" />
            </div>
            <div :class="props.item.posterUrl ? 'col-md-8' : 'col-12'">
              <section-with-buttons title="Translations" :items="props.item.translations" @get-details="getDetails" />
            </div>
          </div>

          <section-with-buttons title="Seasons" :items="props.item.seasons" replace-from="Сезон" replace-to="Season"
            @get-details="getDetails" />

          <section-with-buttons title="Episodes" :items="props.item.episodes" replace-from="Серия" replace-to="Episode"
            @get-details="getDetails" />

          <div v-if="props.item.streams && props.item.streams.length">
            <h6>Actions</h6>
            <stream-dropdown label="Watch" :streams="props.item.streams" @select="showPlayer($event.mp4)" />
            <stream-dropdown v-if="isAndroid" label="Watch External" :streams="props.item.streams"
              @select="openStream($event.mp4Android)" />
            <stream-dropdown label="Open in Tab" :streams="props.item.streams" @select="openStream($event.mp4)" />
            <stream-dropdown label="Copy Url" :streams="props.item.streams" @select="copyStreamUrl($event.mp4)" />
            <stream-dropdown label="Download" :streams="props.item.streams"
              @select="downloadToLocal($event.mp4, $event.mp4FileName)" />
            <stream-dropdown label="Download To Server" :streams="props.item.streams"
              @select="downloadToServer($event.mp4, $event.mp4FileName)" />
          </div>

          <div v-if="videoUrl" class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">Video</h6>
              <button class="btn btn-sm btn-danger" @click="hidePlayer()" aria-label="Close Player">Close
                Player</button>
            </div>
            <div class="ratio bg-dark rounded overflow-hidden">
              <video id="my-video" class="video-js vjs-default-skin" controls preload="auto" width="640" height="264"
                poster="" data-setup="{}">
                <source :src="videoUrl" type="video/mp4" />
                <p class="vjs-no-js">
                  To view this video please enable JavaScript, and consider upgrading to a
                  <a href="videojs.com" target="_blank">supports HTML5 video</a>
                </p>
              </video>
            </div>
          </div>

          <!-- RAW JSON -->
          <div>
            <p class="d-inline-flex gap-1">
              <a class="btn btn-outline-success" data-bs-toggle="collapse" href="#json-collapse" role="button"
                aria-expanded="false" aria-controls="json-collapse">
                RAW JSON
              </a>
            </p>
            <div class="collapse" id="json-collapse">
              <div
                style="white-space: pre; font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 6px;">
                {{ JSON.stringify(props.item, null, 2) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
