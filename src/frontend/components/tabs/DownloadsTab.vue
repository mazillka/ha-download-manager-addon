<script setup lang="ts">
import { watch, onMounted } from "vue";
import { formatBytes } from "../../utils/format";
import { EmptyState, SkeletonGrid } from "../";
import { useDownloadsStore } from "../../stores/downloads";
import { useAppStore } from "../../stores/app";
import { storeToRefs } from "pinia";

const downloadsStore = useDownloadsStore();
const { list } = storeToRefs(downloadsStore);

const appStore = useAppStore();
const { isLoading, activeTab } = storeToRefs(appStore);

onMounted(() => {
    if (activeTab.value === "downloads") {
        downloadsStore.fetch(true);
    }
});

watch(activeTab, (val) => {
    if (val === "downloads") {
        downloadsStore.fetch(true);
    }
});
</script>

<template>
    <div class="downloads-tab">
        <skeleton-grid v-if="isLoading && list.length === 0" :count="12" />

        <empty-state v-else-if="list.length === 0" icon="mdi-download-outline" title="No active downloads"
            message="Your downloads will appear here once you start downloading content." action-text="Browse Content"
            action-icon="mdi-magnify" @action="appStore.setActiveTab('search')" />

        <v-card v-else>
            <v-list lines="two">
                <v-list-item v-for="item in list" :key="item.id" :title="item.filename">
                    <template v-slot:subtitle>
                        <v-progress-linear :model-value="item.progress" class="my-1"></v-progress-linear>
                        {{ formatBytes(item.loaded) }} / {{ item.total ? formatBytes(item.total) : '?' }}
                        <span v-if="item.status === 'downloading'">({{ formatBytes(item.speed) }}/s)</span>
                    </template>

                    <template v-slot:append>
                        <v-chip class="ml-3"
                            :color="item.status === 'downloading' ? 'primary' : (item.status === 'completed' ? 'success' : (item.status === 'error' ? 'red' : 'grey'))"
                            dark>{{ item.status }}</v-chip>
                        <v-btn v-if="item.status === 'downloading'" icon="mdi-pause" variant="text"
                            @click="downloadsStore.pause(item.id)"></v-btn>
                        <v-btn v-if="item.status === 'paused' || item.status === 'error'" icon="mdi-play" variant="text"
                            @click="downloadsStore.resume(item.id)"></v-btn>
                        <v-btn v-if="item.status === 'downloading' || item.status === 'pending'" icon="mdi-cancel"
                            variant="text" @click="downloadsStore.cancel(item.id)"></v-btn>
                        <v-btn icon="mdi-delete" variant="text" @click="downloadsStore.remove(item.id)"></v-btn>
                    </template>
                </v-list-item>
            </v-list>
        </v-card>

        <div v-if="list.length > 0 && list.length % 20 === 0" class="d-flex justify-center mt-4">
            <v-btn variant="text" @click="downloadsStore.loadMore">Load More</v-btn>
        </div>
    </div>
</template>
