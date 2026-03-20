<script setup lang="ts">
import { computed, onMounted } from "vue";
import { showConfirm } from "../utils/alerts";
import { useWatchLaterStore } from "../stores/watchLater";

const props = defineProps<{
  name: string;
  year: string;
  url: string;
  image: string;
  category: string;
}>();

const watchLaterStore = useWatchLaterStore();

onMounted(async () => {
  await watchLaterStore.init();
});

const isInList = computed(() =>
  watchLaterStore.has(props)
);

const icon = computed(() =>
  isInList.value
    ? "mdi-bookmark-minus-outline"
    : "mdi-bookmark-plus-outline"
);

const color = computed(() =>
  isInList.value ? "error" : "primary"
);

const text = computed(() =>
  isInList.value ? "In Watch Later" : "Watch Later"
);

async function toggleWatchLater() {
  if (isInList.value) {
    const ok = await showConfirm({
      title: "Remove from Watch Later",
      text: "Are you sure you want to remove from Watch Later?",
    });
    if (!ok) return;

    await watchLaterStore.remove(props);
  } else {
    await watchLaterStore.add(props);
  }
}
</script>

<template>
  <v-btn :prepend-icon="icon" :color="color" variant="outlined" class="mt-2" block :title="text"
    @click.stop="toggleWatchLater">
    {{ text }}
  </v-btn>
</template>
