<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { api } from "../../api";
import { WatchLater } from "../../../common/interfaces";
import { EmptyState, ContentGrid, SkeletonGrid } from "../";
import { useWatchLaterStore } from "../../stores/watchLater";
import { useAppStore } from "../../stores/app";
import { storeToRefs } from "pinia";

const watchLaterStore = useWatchLaterStore();
const appStore = useAppStore();
const { isLoading, activeTab } = storeToRefs(appStore);

const watchLaterList = ref<WatchLater[]>([]);
const page = ref(1);

onMounted(async () => {
    await watchLaterStore.init();

    if (activeTab.value === "watch-later") {
        await getWatchLaterList(true);
    }
});

watch(
    () => watchLaterStore.list,
    (newList) => {
        if (newList) {
            watchLaterList.value = watchLaterList.value.filter(
                item => newList.has(item.url)
            );
        }
    }, { deep: true }
);

watch(activeTab, async (val) => {
    if (val === "watch-later") {
        await getWatchLaterList(true);
    }
});

async function getWatchLaterList(reset: boolean = false) {
    if (reset) {
        page.value = 1;
        watchLaterList.value = [];
    }

    const { list } = await api.getWatchLater(page.value);

    if (reset) {
        watchLaterList.value = list;
    } else {
        watchLaterList.value = [...watchLaterList.value, ...list];
    }
}

async function onLoadMore() {
    page.value++;
    await getWatchLaterList(false);
}
</script>

<template>
    <skeleton-grid v-if="isLoading && watchLaterList.length === 0" :count="12" />

    <empty-state v-else-if="!isLoading && watchLaterList.length === 0" icon="mdi-bookmark-outline"
        title="No items in Watch Later" message="Add items to your Watch Later list to view them here."
        action-text="Browse Content" action-icon="mdi-magnify" @action="appStore.setActiveTab('search')" />

    <content-grid v-else :items="watchLaterList" @get-details="appStore.getDetails" />

    <div v-if="!isLoading && watchLaterList.length > 0 && watchLaterList.length % 20 === 0"
        class="d-flex justify-center mt-4">
        <v-btn variant="text" @click="onLoadMore">Load More</v-btn>
    </div>
</template>
