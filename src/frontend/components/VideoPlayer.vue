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
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Video</h6>
            <button class="btn btn-sm btn-danger" @click="hidePlayer" aria-label="Close Player">
                Close Player
            </button>
        </div>
        <div class="ratio bg-dark rounded overflow-hidden">
            <video id="my-video" class="video-js vjs-default-skin" controls preload="auto" width="640" height="264"
                poster="" data-setup="{}">
                <source :src="videoUrl" type="video/mp4" />
                <p class="vjs-no-js">
                    To view this video please enable JavaScript, and consider upgrading to a
                    <a href="https://videojs.com" target="_blank">supports HTML5 video</a>
                </p>
            </video>
        </div>
    </div>
</template>
