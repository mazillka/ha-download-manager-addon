<script setup lang="ts">
const props = defineProps<{
  label: string;
  streams: {
    quality: string;
    url: string;
    season: number;
    episode: number;
    name: string;
    translator_id: number;
    subtitles: { data: boolean; codes: boolean };
  }[];
}>();

const emit = defineEmits<{
  (e: "select", video: { quality: string; url: string }): void;
}>();
</script>

<template>
  <v-menu>
    <template v-slot:activator="{ props: menu }">
      <v-btn color="primary" v-bind="menu" class="me-2 mb-2">{{ props.label }}</v-btn>
    </template>
    <v-list>
      <v-list-item v-for="(video, index) in props.streams" :key="index + '-' + video.url"
        @click="emit('select', video)">
        <v-list-item-title>[{{ video.quality }}]</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
