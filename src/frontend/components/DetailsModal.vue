<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { SanitizeFileName } from "../../common/utils";
import { api } from "../api";
import type { ParseResult } from "../../common/interfaces";
import { StreamDropdown, SectionWithButtons, LoadingOverlay, AddToWatchLaterButton, VideoPlayer } from "./";
import { showConfirm, showSuccess } from "../utils/alerts";

const props = defineProps<{
  item: ParseResult | null;
  url: string | null;
}>();

const emit = defineEmits<{
  (e: "get-details", item: any): void;
}>();

const dialog = ref(false);
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

watch(() => props.item, (newItem) => {
  if (newItem) {
    videoUrl.value = null;
    dialog.value = true;
  }
});

const isAndroid = computed(() => /android/i.test(navigator.userAgent));

function getDetails(item: any) {
  emit("get-details", item);
}

function showPlayer(url: string) {
  videoUrl.value = url;
}

function openStream(url: string | undefined | null) {
  if (!url) return;
  window.open(url, "_blank");
}

function copyStreamUrl(url: string) {
  navigator.clipboard.writeText(url);
}

async function downloadToLocal(url: string, filename: string | null | undefined) {
  if (!url || !filename) return;

  loading.value = true;
  download.value.reset();

  try {
    const response = await fetch(url, { signal: download.value.controller.signal });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const total = Number(response.headers.get("content-length")) || 0;
    download.value.total = total;

    const reader = response.body!.getReader();
    const chunks: BlobPart[] = [];
    let loaded = 0;
    let lastTime = performance.now();
    let lastLoaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        loaded += value.length;
        download.value.loaded = loaded;
        if (total) download.value.progress = Math.round((loaded / total) * 100);

        const now = performance.now();
        if (now - lastTime >= 500) {
          download.value.speed = (loaded - lastLoaded) / ((now - lastTime) / 1000);
          lastLoaded = loaded;
          lastTime = now;
        }
      }
    }

    const blob = new Blob(chunks);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (error: any) {
    if (error.name === "AbortError") console.log("Download cancelled");
    else console.error("Error downloading file:", error);
  } finally {
    loading.value = false;
    download.value.reset();
  }
}

function cancelLocalDownload() {
  download.value.controller.abort();
}

async function downloadToServer(url: string, filename: string | undefined | null) {
  if (!url || !filename) return;

  filename = SanitizeFileName(filename);

  const ok = await showConfirm({
    title: "Download To Server",
    text: `Are you sure you want to download ${filename} to server?`,
  });

  if (!ok) return;

  const payload = { url, filename };
  await api.downloadToServer(payload);

  await showSuccess({ title: "Download started on Server" });
}
</script>

<style scoped>
.json-viewer {
  white-space: pre-wrap;
  font-family: monospace;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 6px;
}
</style>

<template>
  <loading-overlay :loading="loading" :progress="download.progress" :loaded="download.loaded" :total="download.total"
    :speed="download.speed" @cancel-local-download="cancelLocalDownload" />

  <v-dialog v-model="dialog" max-width="800px">
    <v-card v-if="props.item">
      <v-card-title class="d-flex align-center">
        <a :href="props.url || '#'" target="_blank">{{ props.item.titleOriginal || props.item.title }}</a>
        <v-btn icon="mdi-close" variant="text" class="ml-auto" @click="dialog = false"></v-btn>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col md="4" class="text-center" v-if="props.item.posterUrl">
            <v-img class="rounded" max-height="250" :src="props.item.posterUrl" :alt="props.item.title" />
            <add-to-watch-later-button :title="props.item.titleOriginal || props.item.title"
              :page-url="props.url || '#'" :poster-url="props.item.posterUrl" />
          </v-col>
          <v-col :md="props.item.posterUrl ? 8 : 12">
            <section-with-buttons title="Translations" :items="props.item.translations" @get-details="getDetails" />
          </v-col>
        </v-row>

        <section-with-buttons title="Seasons" :items="props.item.seasons" replace-from="Сезон" replace-to="Season"
          @get-details="getDetails" />

        <section-with-buttons title="Episodes" :items="props.item.episodes" replace-from="Серия" replace-to="Episode"
          @get-details="getDetails" />

        <div v-if="props.item.streams && props.item.streams.length" class="mt-4">
          <div class="text-h6">Actions</div>
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

        <video-player :video-url="videoUrl"></video-player>

        <v-expansion-panels class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title>RAW JSON</v-expansion-panel-title>
            <v-expansion-panel-text>
              <pre class="json-viewer">{{
                JSON.stringify(props.item, null, 2) }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
