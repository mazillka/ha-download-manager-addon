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
  <v-menu>
    <template v-slot:activator="{ props: menu }">
      <v-btn color="primary" v-bind="menu" class="me-2 mb-2">{{ props.label }}</v-btn>
    </template>
    <v-list>
      <v-list-item
        v-for="(stream, index) in props.streams"
        :key="index + '-' + stream.mp4"
        @click="emit('select', stream)"
      >
        <v-list-item-title>[{{ stream.quality }}]</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
