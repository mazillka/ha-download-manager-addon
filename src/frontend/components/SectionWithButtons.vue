<script setup lang="ts">
interface Item {
  name: string;
  url: string;
  active?: boolean;
}

const props = defineProps<{
  title: string;
  items: Item[] | undefined;
  replaceFrom?: string;
  replaceTo?: string;
}>();

const emit = defineEmits<{
  (e: "get-details", item: Item): void;
}>();

function getDetails(item: Item) {
  emit("get-details", item);
}

function formatName(name: string) {
  if (!props.replaceFrom) return name;
  return name.replace(props.replaceFrom, props.replaceTo || "");
}
</script>

<template>
  <div v-if="props.items && props.items.length">
    <h6>{{ props.title }}</h6>

    <div class="d-flex flex-wrap mb-3">
      <button v-for="(item, index) in props.items" :key="index + '-' + item.url" class="btn btn-sm me-2 mb-2"
        :class="item.active ? 'btn-success' : 'btn-outline-primary'" :disabled="item.active" @click="getDetails(item)">
        {{ formatName(item.name) }}
      </button>
    </div>
  </div>
</template>
