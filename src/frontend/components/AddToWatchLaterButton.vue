<script setup lang="ts">
import { api } from "../api";
import { showSuccess } from "../utils/alerts";

const props = defineProps<{
  title: string;
  year: number | string;
  pageUrl: string | undefined;
  posterUrl: string;
}>();

const emit = defineEmits<{
  (e: "get-watch-later-list"): void;
}>();

async function getWatchLaterList() {
  emit("get-watch-later-list");
}

async function addToWatchLater() {
  const payload = {
    title: props.title,
    year: props.year,
    pageUrl: props.pageUrl,
    posterUrl: props.posterUrl,
  };

  await api.addWatchLater(payload);

  await getWatchLaterList();

  showSuccess({ title: "Added to Watch Later" });
}
</script>

<template>
  <v-btn variant="outlined" color="primary" class="mt-2" @click.stop="addToWatchLater" title="Add to Watch Later" block>
    Add to Watch Later
  </v-btn>
</template>
