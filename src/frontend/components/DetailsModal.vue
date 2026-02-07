<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { SanitizeFileName } from "../../common/utils";
import { api } from "../api";
import type { ParseResult } from "../../common/interfaces";
import { StreamDropdown, LoadingOverlay, WatchLaterButton, VideoPlayer } from "./";
import { showConfirm, showSuccess } from "../utils/alerts";

const props = defineProps<{
  item: ParseResult | null;
}>();

const emit = defineEmits<{
  (e: "get-details", t: string): void;
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

let activeTranslation = ref<any>(null);
let activeSeason = ref<any>(null);
let activeEpisode = ref<any>(null);

let streamsObj = ref<any>(null);

const translations = computed(() => {
  if (!props.item || !props.item?.translations) return [];

  return Object.entries(props.item?.translations).map(
    ([id, value]) => ({
      translator_id: parseInt(id),
      translator_name: value.name,
      premium: value.premium,
    })
  );
});

const seasons = computed(() => {
  if (!props.item || !props.item?.seasonsInfo) return [];

  const translationId =
    activeTranslation.value?.translator_id ??
    props.item.activeTranslation?.translator_id;

  if (!translationId) return [];

  return props.item?.seasonsInfo
    .map(season => {
      const episodes = season.episodes.filter((e: any) =>
        e.translations.some((t: any) => t.translator_id === translationId)
      );
      return episodes.length ? { ...season, episodes } : null;
    })
    .filter(Boolean);
});

const episodes = computed(() => {
  if (!activeSeason.value) return [];

  const season = seasons.value.find(
    s => s.season === activeSeason.value.season
  );

  return season?.episodes ?? [];
});

watch(seasons, (list) => {
  if (!list.length) return;

  if (!activeSeason.value || !list.some(s => s.season === activeSeason.value.season)) {
    activeSeason.value = list[0];
  }
});

watch(activeSeason, (season) => {
  if (!season?.episodes?.length) return;
  activeEpisode.value = season.episodes[0];
});

watch(
  () => props.item,
  (item) => {
    if (!item) return;

    videoUrl.value = null;
    dialog.value = true;

    activeTranslation.value = item.activeTranslation || translations.value[0] || null;

    if (item.isTVSeries) {
      activeSeason.value = item.activeSeason || null;
      activeEpisode.value = item.activeEpisode || null;
    }

    streamsObj.value = item.streams;
  },
  { immediate: true }
);

async function getStreams() {
  if (!props.item) return;

  const payload = {
    url: props.item.url,
    translator_id: activeTranslation?.value.translator_id,
    season: activeSeason.value?.season,
    episode: activeEpisode.value?.episode,
  };

  setStreams(null);

  const { streams } = await api.getStreams(payload) || { streams: null };

  setStreams(streams);
}

function androidUrl(url: string) {
  return `intent:${url}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`;
};

function fileName(quality: string) {
  const season = activeSeason.value?.season;
  const episode = activeEpisode.value?.episode;
  const isTVSeries = props.item?.isTVSeries;

  const title = props.item?.originalName || props.item?.name;

  const year = props.item?.releaseYear;

  const seasonEpisode = isTVSeries
    ? `S${season}E${episode} `
    : "";

  const yearStr = isTVSeries ? " " : ` (${year}) `;

  return `${title}${yearStr}${seasonEpisode}[${quality}].mp4`;
};

function setStreams(streams: any) {
  streamsObj.value = streams;
}

async function setActiveTranslation(translation: any) {
  activeTranslation.value = translation;

  await getStreams();
}

function isActiveTranslation(translation: any): boolean {
  return activeTranslation.value?.translator_id == translation.translator_id || false;
}

async function setActiveSeason(season: any) {
  activeSeason.value = season;

  await getStreams();
}

function isActiveSeason(season: any): boolean {
  return activeSeason.value?.season == season.season || false;
}

async function setActiveEpisode(episode: any) {
  activeEpisode.value = episode;

  await getStreams();
}

function isActiveEpisode(episode: any): boolean {
  return activeEpisode.value?.episode == episode.episode || false;
}

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
        <a :href="props.item.url" target="_blank">{{ props.item.originalName || props.item.name }}</a>
        <v-btn icon="mdi-close" variant="text" class="ml-auto" @click="dialog = false"></v-btn>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col md="4" class="text-center" v-if="props.item.image">
            <v-img class="rounded" max-height="250" :src="props.item.image" :alt="props.item.name" />

            <watch-later-button :name="props.item.originalName || props.item.name" :year="props.item.releaseYear"
              :url="props.item.url" :image="props.item.image" />
          </v-col>

          <v-col :md="props.item.image ? 8 : 12">
            <v-expansion-panels>
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <div class="text-h6">Description</div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  {{ props.item.description }}
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <div class="text-h6">Other Parts</div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-data-table density="compact" :headers="[
                    { title: '#', key: 'num' },
                    { title: 'title', key: 'title' },
                    { title: 'year', key: 'year' },
                    { title: 'actions', key: 'actions' }
                  ]" :items="props.item.otherParts" :items-per-page="-1" item-key="num" class="elevation-1"
                    hide-default-header hide-default-footer height="400" fixed-header>
                    <template #item.title="{ item }">
                      <div class="d-flex align-center">
                        <a href="#" :style="{ color: item.current ? 'blue' : 'inherit' }" class="me-2"
                          @click="emit('get-details', item.url)">{{ item.title }}</a>
                      </div>
                    </template>
                  </v-data-table>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>




            <div v-if="translations">
              <div class="text-h6">Translations</div>
              <div class="d-flex flex-wrap mb-3">
                <v-btn v-for="translation in translations" size="small" class="me-2 mb-2" variant="outlined"
                  color="primary" @click="setActiveTranslation(translation)"
                  :disabled="isActiveTranslation(translation)">
                  {{ translation.translator_name }}
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row v-if="item?.isTVSeries">
          <v-col md="12">
            <div>
              <div class="text-h6">Seasons</div>
              <div class="d-flex flex-wrap mb-3">
                <v-btn v-for="season in seasons" size="small" class="me-2 mb-2" variant="outlined" color="primary"
                  @click="setActiveSeason(season)" :disabled="isActiveSeason(season)">
                  {{ season.season_text }}
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row v-if="item?.isTVSeries">
          <v-col md="12">
            <div>
              <div class="text-h6">Episodes</div>
              <div class="d-flex flex-wrap mb-3">
                <v-btn v-for="episode in episodes" size="small" class="me-2 mb-2" variant="outlined" color="primary"
                  @click="setActiveEpisode(episode)" :disabled="isActiveEpisode(episode)">
                  {{ episode.episode_text }}
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>

        <div class="mt-4">
          <div class="text-h6">
            <span class="cursor-pointer" :class="streamsObj ? 'text-black' : 'text-red'" @click="getStreams()">
              Actions
            </span>
          </div>
          <div v-if="streamsObj">
            <stream-dropdown label="Watch" :streams="streamsObj" @select="showPlayer($event.url)" />
            <stream-dropdown v-if="isAndroid" label="Watch External" :streams="streamsObj"
              @select="openStream(androidUrl($event.url))" />

            <div class="d-none">
              <stream-dropdown label="Open in Tab" :streams="streamsObj" @select="openStream($event.url)" />
              <stream-dropdown label="Copy Url" :streams="streamsObj" @select="copyStreamUrl($event.url)" />
            </div>

            <stream-dropdown label="Download" :streams="streamsObj"
              @select="downloadToLocal($event.url, fileName($event.quality))" />
            <stream-dropdown label="Download To Server" :streams="streamsObj"
              @select="downloadToServer($event.url, fileName($event.quality))" />
          </div>
        </div>

        <video-player v-model:video-url="videoUrl"></video-player>

        <!-- TODO: hiden -->
        <v-expansion-panels class="mt-4 d-none">
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
