<script setup lang="ts">
withDefaults(defineProps<{
    icon?: string;
    title?: string;
    message?: string;
    actionText?: string;
    actionIcon?: string;
}
>(), {
    icon: "mdi-information-outline",
    title: "No items found",
    message: "",
    actionText: "",
    actionIcon: "",
});

const emit = defineEmits<{
    (e: "action"): void;
}>();
</script>

<template>
    <v-container class="empty-state">
        <v-row justify="center">
            <v-col cols="12" sm="8" md="6" class="text-center">
                <v-icon :icon="icon" size="80" color="grey-lighten-1" class="mb-4" />
                <h2 class="text-h5 mb-2">{{ title }}</h2>
                <p v-if="message" class="text-body-1 text-grey mb-4">{{ message }}</p>
                <v-btn v-if="actionText" color="primary" variant="outlined" :prepend-icon="actionIcon"
                    @click="emit('action')">
                    {{ actionText }}
                </v-btn>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>
.empty-state {
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
