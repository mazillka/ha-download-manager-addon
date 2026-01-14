<script setup lang="ts">
import { showSuccessDialog } from "../utils/dialogs";
import { api } from "../api";

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

  showSuccessDialog("Added to Watch Later");
}
</script>

<template>
  <button class="btn btn-outline-primary mt-2" @click.stop="addToWatchLater" title="Add to Watch Later">
    Add to Watch Later
  </button>
</template>
