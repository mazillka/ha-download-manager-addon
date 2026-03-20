<script setup lang="ts">
import { watch, onMounted } from "vue";
import { useSettingsStore } from "../../stores/settings";
import { useAppStore } from "../../stores/app";
import { storeToRefs } from "pinia";

const settingsStore = useSettingsStore();
const { configs } = storeToRefs(settingsStore);

const appStore = useAppStore();
const { activeTab } = storeToRefs(appStore);

onMounted(() => {
    if (activeTab.value === "settings") {
        settingsStore.load();
    }
});

watch(activeTab, (val) => {
    if (val === "settings" && !settingsStore.loaded) {
        settingsStore.load();
    }
});
</script>

<template>
    <v-card>
        <v-card-text>
            <v-text-field v-for="config in configs" :key="config.key" v-model="config.value"
                :label="config.description"></v-text-field>
        </v-card-text>
        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="outlined" @click="settingsStore.save">Save</v-btn>
        </v-card-actions>
    </v-card>
</template>
