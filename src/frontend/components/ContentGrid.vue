<script setup lang="ts">
import { WatchLaterButton, EmptyState, SkeletonGrid } from ".";

const props = withDefaults(defineProps<{
    items: {
        url: string, name: string, year: string, image: string, category: string
    }[];
    loading?: boolean;
    emptyMessage?: string;
}>(), {
    loading: false,
    emptyMessage: "No items found",
});

const emit = defineEmits<{
    (e: "get-details", item: { url: string }): void;
}>();
</script>

<template>
    <div>
        <!-- Skeleton Grid -->
        <skeleton-grid v-if="loading && items.length === 0" :count="12" />

        <!-- Empty State -->
        <empty-state v-else-if="!loading && items.length === 0" icon="mdi-magnify-remove-outline"
            :title="emptyMessage" />

        <!-- Content Grid -->
        <v-row v-else>
            <v-col v-for="(item, index) in items" :key="index" cols="12" sm="6" md="4" lg="3" xl="2">
                <v-card class="d-flex flex-column content-card" height="100%" @click="emit('get-details', item)" hover>
                    <v-img class="mt-2" :src="item.image" :alt="item.name" height="150px" contain>
                        <v-chip class="ma-1" color="primary" label>
                            {{ item.category }}
                        </v-chip>
                    </v-img>
                    <v-card-text class="flex-grow-1 card-text">
                        {{ item.name }}<br />{{ item.year }}
                    </v-card-text>
                    <v-card-actions>
                        <watch-later-button :name="item.name" :year="item.year" :url="item.url" :image="item.image"
                            :category="item.category" />
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.card-text {
    min-height: 64px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.content-card {
    cursor: pointer;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.content-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}
</style>
