<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import videojs, { type VideoJsPlayer } from "video.js";
import "video.js/dist/video-js.css";

const props = defineProps<{
    videoUrl: string | null;
}>();

const emit = defineEmits<{
    (e: "update:videoUrl", url: string | null): void;
}>();

function updateVideoUrl(url: string | null) {
    emit("update:videoUrl", url);
}

const videoRef = ref<HTMLVideoElement | null>(null);
let player: VideoJsPlayer | null = null;

onMounted(async () => {
    await nextTick();

    if (!videoRef.value) return;

    player = videojs(videoRef.value, {
        controls: true,
        fluid: true,
        preload: "auto",
        responsive: true,
        sources: props.videoUrl
            ? [{ src: props.videoUrl, type: "video/mp4" }]
            : [],
    });
});

watch(
    () => props.videoUrl,
    (url) => {
        if (!player) return;

        if (url) {
            player.src({ src: url, type: "video/mp4" });
            player.play();
        } else {
            player.pause();
            player.reset();
        }
    }
);

onUnmounted(() => {
    player?.dispose();
    player = null;
});
</script>

<style scoped>
.video-js {
    width: 100%;
    height: 100%;
}
</style>

<template>
    <div v-show="videoUrl">
        <v-toolbar density="compact">
            <v-toolbar-title>Video</v-toolbar-title>
            <v-spacer />
            <v-btn icon="mdi-close" @click="updateVideoUrl(null)" />
        </v-toolbar>

        <v-responsive aspect-ratio="16/9">
            <video ref="videoRef" class="video-js vjs-default-skin vjs-fluid"></video>
        </v-responsive>
    </div>
</template>
