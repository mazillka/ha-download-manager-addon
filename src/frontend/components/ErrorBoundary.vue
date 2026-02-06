<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";

const error = ref<Error | null>(null);
const errInfo = ref<string>("");

onErrorCaptured((e: unknown, instance, info) => {
    error.value = e instanceof Error ? e : new Error(String(e));
    errInfo.value = info;
    console.error("ErrorBoundary caught an error:", e, info);
    return false; // Stop propagation
});

const resetError = () => {
    error.value = null;
    errInfo.value = "";
};
</script>

<template>
    <div v-if="error" class="error-boundary d-flex flex-column align-center justify-center fill-height pa-6">
        <v-icon icon="mdi-alert-circle-outline" size="64" color="error" class="mb-4" />
        <h3 class="text-h5 text-error mb-2">Something went wrong</h3>
        <p class="text-body-1 text-grey-darken-1 text-center mb-6">
            {{ error?.message || "An unexpected error occurred." }}
        </p>
        <v-btn color="primary" prepend-icon="mdi-refresh" @click="resetError">
            Try Again
        </v-btn>
        <v-expansion-panels class="mt-6 w-100" style="max-width: 600px" v-if="errInfo">
            <v-expansion-panel title="Error Details">
                <v-expansion-panel-text>
                    <pre class="text-caption overflow-auto">{{ errInfo }}</pre>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
    <slot v-else />
</template>

<style scoped>
.error-boundary {
    min-height: 400px;
    background-color: rgb(var(--v-theme-surface));
}
</style>
