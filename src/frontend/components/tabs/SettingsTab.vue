<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { api } from "../../api";
import { Config } from "../../../common/interfaces";

const props = defineProps<{
    active: boolean;
}>();

const configs = ref<Config[]>([]);

async function getConfigs() {
    const { list } = await api.getConfigs();
    configs.value = list;
}

async function saveConfig() {
    const { list } = await api.saveConfigs(configs.value);
    configs.value = list;
}

watch(() => props.active, (val) => {
    if (val) {
        getConfigs();
    }
});

onMounted(() => {
    if (props.active) {
        getConfigs();
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
            <v-btn color="primary" variant="outlined" @click="saveConfig">Save</v-btn>
        </v-card-actions>
    </v-card>
</template>
