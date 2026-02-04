<script setup lang="ts">
import { api } from "../api";
import { showSuccess } from "../utils/alerts";

const props = defineProps<{
  name: string;
  year: string;
  url: string;
  image: string;
}>();

const emit = defineEmits<{
  (e: "get-watch-later-list"): void;
}>();

async function getWatchLaterList() {
  emit("get-watch-later-list");
}

async function addToWatchLater() {
  const payload = {
    name: props.name,
    year: props.year,
    url: props.url,
    image: props.image,
  };

  await api.addWatchLater(payload);

  await getWatchLaterList();

  showSuccess({ title: "Added to Watch Later" });
}
</script>

<template>
 <v-btn prepend-icon="mdi-bookmark-plus-outline" variant="outlined" color="primary" class="mt-2"
    @click.stop="addToWatchLater" title="Watch Later" block>
    Watch Later
  </v-btn>
</template>
