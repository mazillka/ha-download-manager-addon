<script setup lang="ts">
import "video.js/dist/video-js.css";
import "video.js/dist/video.js";
import { ref, watch } from "vue";

const props = defineProps<{ videoUrl: string | null }>();
const videoUrl = ref<string | null>(props.videoUrl ?? null);

// -------------------- Watchers --------------------
watch(
    () => props.videoUrl,
    (newVideoUrl) => {
        if (newVideoUrl) {
            showPlayer(newVideoUrl);
            return;
        }
        hidePlayer();
    },
    { immediate: true }
);

function showPlayer(url: string) {
    videoUrl.value = url;
}

function hidePlayer() {
    videoUrl.value = null;
}
</script>

<template>
    <div v-if="videoUrl" class="mb-3">
        <v-toolbar density="compact">
            <v-toolbar-title>Video</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" @click="hidePlayer"></v-btn>
        </v-toolbar>
        <v-responsive :aspect-ratio="640/264">
            <video id="my-video" class="video-js vjs-default-skin" controls preload="auto" data-setup='{"fluid": true}'>
                <source :src="videoUrl" type="video/mp4" />
                <p class="vjs-no-js">
                    To view this video please enable JavaScript, and consider upgrading to a
                    <a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>
                </p>
            </video>
        </v-responsive>
    </div>
</template>
