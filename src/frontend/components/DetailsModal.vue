<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { SanitizeFileName } from "../../common/utils";
import { api } from "../api";
import type { DetailsResult } from "../../common/interfaces";
import { StreamDropdown, LoadingOverlay, WatchLaterButton, VideoPlayer, SectionWithButtons } from "./";
import { showConfirm, showSuccess } from "../utils/alerts";
import { useGlobalStore } from "../stores/global";
import { useAppStore } from "../stores/app";

const props = defineProps<{
  details: DetailsResult | null;
}>();

const globalStore = useGlobalStore();
const appStore = useAppStore();

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

let tooltipVisible = ref(false);

watch(
  () => props.details,
  (details) => {
    if (!details) return;

    videoUrl.value = null;
    dialog.value = true;

    const activeTranslator = details.translations?.find((s: any) => s.active)?.translator;
    const activeSeason = details.seasons?.find((s: any) => s.active)?.season;
    const activeEpisode = details.episodes?.find((s: any) => s.active)?.episode;

    globalStore.setCategory(details.category || "");
    globalStore.setTranslator(activeTranslator || "");
    globalStore.setSeason(activeSeason || "");
    globalStore.setEpisode(activeEpisode || "");
  },
  { immediate: true }
);


function androidUrl(url: string) {
  return `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`;
};

function fileName(stream: any) {
  const isTVSeries = props.details?.isTVSeries;

  const title = stream.originalName || stream.name;

  const year = props.details?.releaseYear;

  const seasonEpisode = isTVSeries
    ? `S${stream.season}E${stream.episode} `
    : "";

  const yearStr = isTVSeries ? " " : ` (${year}) `;

  return `${title}${yearStr}${seasonEpisode}[${stream.quality}].mp4`;
};

const isAndroid = computed(() => /android/i.test(navigator.userAgent));

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
  download.value.reset();
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

async function getDetails({ url, category, translator, season, episode }: { url: string; category?: string; translator?: string; season?: string; episode?: string }) {

  console.error("BEGIN - getDetails - ");

  console.log("url: ", url);
  console.log("category: ", category);
  console.log("translator: ", translator);
  console.log("season: ", season);
  console.log("episode: ", episode);

  console.error("END - getDetails - ");

  if (category) globalStore.setCategory(category);
  if (translator) globalStore.setTranslator(translator);
  if (season) globalStore.setSeason(season);
  if (episode) globalStore.setEpisode(episode);

  await appStore.getDetails({ url, category, translator, season, episode });
}

</script>

<style scoped>
.json-viewer {
  overflow-x: auto;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: monospace;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 6px;
}

.v-expansion-panel-text__wrapper {
  padding: 8px 8px 8px !important;
}
</style>

<template>
  <loading-overlay :loading="loading" :progress="download.progress" :loaded="download.loaded" :total="download.total"
    :speed="download.speed" @cancel-local-download="cancelLocalDownload" />

  <v-dialog v-model="dialog" max-width="1200px">
    <v-card v-if="props.details">
      <v-card-title class="d-flex align-center">
        <a :href="props.details.url" target="_blank">{{ props.details.originalName || props.details.name }}</a>
        <v-btn icon="mdi-close" variant="text" class="ml-auto" @click="dialog = false"></v-btn>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col md="4" class="text-center" v-if="props.details.image">

            <v-img
              v-tooltip="{ text: props.details.description, openOnHover: false, target: 'cursor', openOnClick: true, maxWidth: '680px' }"
              class="rounded" max-height="250" :src="props.details.image" :alt="props.details.name" />

            <watch-later-button :name="props.details.originalName || props.details.name"
              :year="props.details.releaseYear" :url="props.details.url" :image="props.details.image"
              :category="props.details.category" />
          </v-col>

          <v-col :md="props.details.image ? 8 : 12">
            <v-expansion-panels class="mb-3">
              <v-expansion-panel v-if="props.details.otherParts?.length > 0">
                <v-expansion-panel-title>
                  <div class="text-h6">Other Parts</div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-data-table height="auto" density="compact" :headers="[
                    { title: '#', key: 'num' },
                    { title: 'title', key: 'title' },
                    { title: 'year', key: 'year' },
                    { title: 'actions', key: 'actions' }
                  ]" :items="props.details.otherParts" :items-per-page="-1" item-key="num" class="elevation-1"
                    hide-default-header hide-default-footer fixed-header>
                    <template #item.title="{ item }">
                      <div class="d-flex align-center">
                        <a href="#" :style="{ color: item.current ? 'blue' : 'inherit' }" class="me-2"
                          @click="appStore.getDetails({ url: item.url })">{{ item.title }}</a>
                      </div>
                    </template>
                  </v-data-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <section-with-buttons title="Translations" :items="props.details.translations"
              @get-details="getDetails($event)" season="1" episode="1" :category="globalStore.category" />

            <section-with-buttons title="Seasons" :items="props.details.seasons" @get-details="getDetails($event)"
              :translator="globalStore.translator" episode="1" :category="globalStore.category" />

            <section-with-buttons title="Episodes" :items="props.details.episodes" @get-details="getDetails($event)"
              :translator="globalStore.translator" :season="globalStore.season" :category="globalStore.category" />
          </v-col>
        </v-row>

        <div class="mt-4">
          <div class="text-h6">
            Actions
          </div>
          <div v-if="props.details.streams">
            <stream-dropdown label="Watch" :streams="props.details.streams" @select="showPlayer($event.url)" />
            <stream-dropdown v-if="isAndroid" label="Watch External" :streams="props.details.streams"
              @select="openStream(androidUrl($event.url))" />

            <div class="d-none">
              <stream-dropdown label="Open in Tab" :streams="props.details.streams" @select="openStream($event.url)" />
              <stream-dropdown label="Copy Url" :streams="props.details.streams" @select="copyStreamUrl($event.url)" />
            </div>

            <stream-dropdown label="Download" :streams="props.details.streams"
              @select="downloadToLocal($event.url, fileName($event))" />
            <stream-dropdown label="Download To Server" :streams="props.details.streams"
              @select="downloadToServer($event.url, fileName($event))" />
          </div>
        </div>

        <video-player v-model:video-url="videoUrl"></video-player>

        <!-- TODO: hiden -->
        <v-expansion-panels class="mt-4 d-none">
          <v-expansion-panel>
            <v-expansion-panel-title>RAW JSON</v-expansion-panel-title>
            <v-expansion-panel-text>
              <pre class="json-viewer">{{
                JSON.stringify(props.details, null, 2) }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
