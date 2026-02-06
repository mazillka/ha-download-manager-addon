<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(defineProps<{
    color?: string;
    timeout?: number;
}>(), {
    color: "success",
    timeout: 3000,
});

const show = ref(false);
const message = ref("");
const currentColor = ref(props.color);

const display = (msg: string, color: string = props.color) => {
    message.value = msg;
    currentColor.value = color;
    show.value = true;
};

defineExpose({
    display,
});
</script>

<template>
    <v-snackbar v-model="show" :color="currentColor" :timeout="timeout" location="bottom center" elevation="24">
        <div class="d-flex align-center">
            <v-icon v-if="currentColor === 'success'" icon="mdi-check-circle" class="mr-2" />
            <v-icon v-else-if="currentColor === 'error'" icon="mdi-alert-circle" class="mr-2" />
            <v-icon v-else icon="mdi-information" class="mr-2" />
            {{ message }}
        </div>

        <template v-slot:actions>
            <v-btn variant="text" icon="mdi-close" @click="show = false"></v-btn>
        </template>
    </v-snackbar>
</template>
