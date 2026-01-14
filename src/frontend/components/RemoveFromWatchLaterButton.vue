<script setup lang="ts">
import { showWarningDialog } from "../utils/dialogs";
import { api } from "../api";

const props = defineProps<{
    pageUrl: string;
}>();

async function removeFromWatchLater() {
    const isConfirmed = await showWarningDialog(
        "Are you sure?",
        "Remove from Watch Later?"
    );

    if (!isConfirmed) return;

    await api.deleteWatchLater(props.pageUrl);
}
</script>

<template>
    <button class="btn btn-outline-danger mt-2" @click.stop="removeFromWatchLater"
        title="Remove from Watch Later">Remove from Watch Later</button>
</template>
