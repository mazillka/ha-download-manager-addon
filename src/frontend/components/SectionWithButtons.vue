<script setup lang="ts">

interface Item {
  name: string;
  active?: boolean;
  url: string;
  translator?: string;
  episode?: string;
  season?: string;
}

const props = defineProps<{
  title: string;
  items: Item[] | undefined;

  translator?: string;
  season?: string;
  episode?: string;
}>();
const emit = defineEmits<{
  (e: "get-details", item: { url: string; translator?: string; season?: string; episode?: string }): void;
}>();
</script>

<template>
  <div v-if="props.items && props.items.length">
    <div class="text-h6">{{ props.title }}</div>

    <div class="d-flex flex-wrap mb-3">
      <v-btn v-for="(item, index) in props.items"
        :key="index + '-' + item.translator + '-' + item.season + '-' + item.episode" size="small" class="me-2 mb-2"
        variant="outlined" color="primary" :disabled="item.active" @click="  emit('get-details',
          {
            url: item.url,
            translator: item.translator || props.translator,
            season: item.season || props.season,
            episode: item.episode || props.episode
          })">
        {{ item.name }} {{ item.translator ? `[${item.translator}]` : "" }}
      </v-btn>
    </div>
  </div>
</template>
