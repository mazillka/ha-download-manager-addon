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

<style>
.spinner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

<template>
  <div v-if="props.loading" class="spinner-overlay">
    <div v-if="props.progress && props.progress > 0" class="text-center">
      <div class="progress">
        <div class="progress-bar" role="progressbar" :style="{ width: props.progress + '%' }">
          {{ props.progress }}%
        </div>
      </div>

      <div class="mt-2 text-primary">
        Downloading...
        {{ formatBytes(props.loaded || 0) }} /
        {{ formatBytes(props.total || 0) }}
        ({{ formatBytes(props.speed || 0) }}/s)
      </div>

      <button class="btn btn-danger btn-sm mt-2" @click="onCancel">
        Cancel
      </button>
    </div>

    <div v-else class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
</template>
