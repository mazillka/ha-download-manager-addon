<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { formatBytes } from "../../utils/format";
import { showConfirm } from "../../utils/alerts";
import { api } from "../../api";
import { EmptyState, SkeletonGrid } from "../";

const props = defineProps<{
    active: boolean;
    isLoading: boolean;
}>();

const emit = defineEmits<{
    (e: "select-tab", value: any): void;
}>();

const serverDownloads = ref<any[]>([]);
const page = ref(1);

async function getServerDownloads(reset: boolean = false) {
    if (reset) {
        page.value = 1;
        serverDownloads.value = [];
    }

    const { list } = await api.getServerDownloads(page.value);

    if (reset) {
        serverDownloads.value = list;
    } else {
        serverDownloads.value = [...serverDownloads.value, ...list];
    }
}

function onLoadMore() {
    page.value++;
    getServerDownloads(false);
}

watch(() => props.active, (val) => {
    if (val) {
        getServerDownloads(true);
    }
});

onMounted(() => {
    if (props.active) {
        getServerDownloads(true);
    }
});

async function cancelServerDownload(id: string) {
    const ok = await showConfirm({
        title: "Cancel Server Download",
        text: "Are you sure you want to cancel server download?",
    });

    if (!ok) return;

    await api.cancelServerDownload(id);
    await getServerDownloads();
}

async function pauseServerDownload(id: string) {
    await api.pauseServerDownload(id);
    await getServerDownloads();
}

async function resumeServerDownload(id: string) {
    await api.resumeServerDownload(id);
    await getServerDownloads();
}

async function deleteServerDownload(id: string) {
    const ok1 = await showConfirm({
        title: "Delete Server Download",
        text: "Are you sure you want to delete server download?",
    });

    if (!ok1) return;

    const ok2 = await showConfirm({
        title: "Delete File From Disk",
        text: "Are you sure you want to delete file from disk?",
    });

    await api.deleteServerDownload(id, ok2);
    await getServerDownloads();
}
</script>

<template>
    <div class="downloads-tab">
        <skeleton-grid v-if="isLoading && serverDownloads.length === 0" :count="12" />

        <empty-state v-else-if="serverDownloads.length === 0" icon="mdi-download-outline" title="No active downloads"
            message="Your downloads will appear here once you start downloading content." action-text="Browse Content"
            action-icon="mdi-magnify" @action="emit('select-tab', 'search')" />

        <v-card v-else>
            <v-list lines="two">
                <v-list-item v-for="item in serverDownloads" :key="item.id" :title="item.filename">
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
                            @click="pauseServerDownload(item.id)"></v-btn>
                        <v-btn v-if="item.status === 'paused' || item.status === 'error'" icon="mdi-play" variant="text"
                            @click="resumeServerDownload(item.id)"></v-btn>
                        <v-btn v-if="item.status === 'downloading' || item.status === 'pending'" icon="mdi-cancel"
                            variant="text" @click="cancelServerDownload(item.id)"></v-btn>
                        <v-btn icon="mdi-delete" variant="text" @click="deleteServerDownload(item.id)"></v-btn>
                    </template>
                </v-list-item>
            </v-list>
        </v-card>

        <div v-if="serverDownloads.length > 0 && serverDownloads.length % 20 === 0" class="d-flex justify-center mt-4">
            <v-btn variant="text" @click="onLoadMore">Load More</v-btn>
        </div>
    </div>
</template>
