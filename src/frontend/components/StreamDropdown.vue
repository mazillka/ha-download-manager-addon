<script setup lang="ts">
import type { Stream } from "../../common/interfaces";

const props = defineProps<{
  label: string;
  streams: Stream[];
}>();

const emit = defineEmits<{
  (e: "select", stream: Stream): void;
}>();
</script>

<template>
  <div class="btn-group me-2 mb-2" role="group" aria-label="Button group with nested dropdown">
    <div class="btn-group" role="group">
      <button type="button" class="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown"
        aria-expanded="false">
        {{ props.label }}
      </button>
      <ul class="dropdown-menu">
        <li v-for="(stream, index) in props.streams" :key="index + '-' + stream.mp4">
          <a class="dropdown-item" href="#" @click.prevent="emit('select', stream)">
            [{{ stream.quality }}]
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
