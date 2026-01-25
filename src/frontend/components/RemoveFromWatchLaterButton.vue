<script setup lang="ts">
import { api } from "../api";
import { showConfirm } from "../utils/alerts";

const props = defineProps<{
    pageUrl: string;
}>();

async function removeFromWatchLater() {
    const ok = await showConfirm({
        title: "Remove from Watch Later",
        text: "Are you sure you want to remove from Watch Later?",
    });

    if (!ok) return;

    await api.deleteWatchLater(props.pageUrl);
}
</script>

<template>
    <v-btn variant="outlined" color="error" class="mt-2" @click.stop="removeFromWatchLater"
        title="Remove from Watch Later" block>Remove from Watch Later</v-btn>
</template>
