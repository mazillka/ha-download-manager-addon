<script setup lang="ts">
import { formatBytes } from "../utils/format";

const props = defineProps<{
  loading: boolean;
  progress?: number;
  loaded?: number;
  total?: number;
  speed?: number;
}>();

const emit = defineEmits<{
  (e: "cancel-local-download"): void;
}>();

function onCancel() {
  emit("cancel-local-download");
}
</script>

<template>
  <v-overlay :model-value="props.loading" class="d-flex justify-center align-center" persistent>
    <div v-if="props.progress && props.progress > 0" class="text-center">
      <v-progress-linear :model-value="props.progress" bg-color="white" color="primary" class="mb-2"></v-progress-linear>
      <div class="text-white">
        Downloading...
        {{ formatBytes(props.loaded || 0) }} /
        {{ formatBytes(props.total || 0) }}
        ({{ formatBytes(props.speed || 0) }}/s)
      </div>
      <v-btn color="danger" size="small" class="mt-2" @click="onCancel">
        Cancel
      </v-btn>
    </div>
    <v-progress-circular v-else indeterminate size="64" color="primary"></v-progress-circular>
  </v-overlay>
</template>
