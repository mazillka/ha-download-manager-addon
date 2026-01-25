<script setup lang="ts">
import { api } from "../api";
import { showSuccess } from "../utils/alerts";

const props = defineProps<{
  title: string;
  pageUrl: string | undefined;
  posterUrl: string;
}>();

async function addToWatchLater() {
  const payload = {
    title: props.title,
    pageUrl: props.pageUrl,
    posterUrl: props.posterUrl,
  };

  await api.addWatchLater(payload);

  showSuccess({ title: "Added to Watch Later" });
}
</script>

<template>
  <v-btn variant="outlined" color="primary" class="mt-2" @click.stop="addToWatchLater" title="Add to Watch Later" block>
    Add to Watch Later
  </v-btn>
</template>
