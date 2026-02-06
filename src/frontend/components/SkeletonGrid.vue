<script setup lang="ts">
withDefaults(defineProps<{
    count?: number;
}>(), {
    count: 6,
});
</script>

<template>
    <v-row>
        <v-col v-for="i in count" :key="i" cols="12" sm="6" md="4" lg="3" xl="2">
            <v-card class="d-flex flex-column" height="100%">
                <v-skeleton-loader type="image" height="150px" />
                <v-card-text>
                    <v-skeleton-loader type="text" />
                    <v-skeleton-loader type="text" width="60%" />
                </v-card-text>
                <v-card-actions>
                    <v-skeleton-loader type="button" width="100px" />
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
</template>

<style scoped>
.v-skeleton-loader {
    background-color: transparent;
}
</style>
