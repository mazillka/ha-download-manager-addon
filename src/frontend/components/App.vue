<script setup lang="ts">
import {
    LoadingOverlay,
    DetailsModal,
    ContentGrid,
    ErrorBoundary,
    ToastNotification,
    SearchTab,
    DownloadsTab,
    SettingsTab,
    WatchLaterTab,
    SkeletonGrid,
} from ".";
import { useAppStore } from "../stores/app";
import { storeToRefs } from "pinia";

const appStore = useAppStore();
const { isLoading, activeTab, parseResult, tabs, tabSearchResults } = storeToRefs(appStore);
</script>

<style>
.swal2-container {
    z-index: 99999 !important;
}
</style>

<template>
    <v-app>
        <loading-overlay :loading="isLoading"></loading-overlay>

        <v-container>
            <v-tabs align-tabs="center" class="mb-6 rounded-lg elevation-2 bg-surface" v-model="activeTab"
                @update:model-value="appStore.setActiveTab" color="primary" slider-color="primary">
                <v-tab v-for="tab in tabs" :key="tab.id" :value="tab.id"
                    class="d-flex align-center text-capitalize font-weight-bold" rounded="lg">
                    <v-icon :icon="tab.icon" start></v-icon>
                    {{ tab.name }}
                </v-tab>
            </v-tabs>

            <error-boundary>
                <v-window v-model="activeTab" class="pa-1">
                    <v-window-item value="search" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <search-tab />
                    </v-window-item>

                    <v-window-item v-for="tabKey in ['watching', 'latest', 'popular']" :key="tabKey" :value="tabKey"
                        transition="scroll-x-transition" reverse-transition="scroll-x-reverse-transition">

                        <skeleton-grid v-if="isLoading && tabSearchResults.length === 0" :count="12" />

                        <content-grid v-else :is-loading="isLoading" :items="tabSearchResults"
                            :empty-message="`No ${tabKey} content available.`" @get-details="appStore.getDetails" />
                    </v-window-item>

                    <v-window-item value="watch-later" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <watch-later-tab />
                    </v-window-item>

                    <v-window-item value="downloads" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <downloads-tab />
                    </v-window-item>

                    <v-window-item value="settings" transition="scroll-x-transition"
                        reverse-transition="scroll-x-reverse-transition">
                        <settings-tab />
                    </v-window-item>
                </v-window>
            </error-boundary>
        </v-container>

        <toast-notification ref="toast" />

        <details-modal :details="parseResult"></details-modal>
    </v-app>
</template>
