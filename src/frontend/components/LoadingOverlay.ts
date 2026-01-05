import { defineComponent } from "vue";

export default defineComponent({
  name: "LoadingOverlay",

  props: {
    loading: {
      type: Boolean,
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    loaded: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    speed: {
      type: Number,
      default: 0,
    },
  },

  methods: {
    formatBytes(bytes: number) {
      if (!bytes) {
        return "0 B";
      }
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
    },
  },

  template: `
    <div v-if="loading" class="spinner-overlay">
      <div v-if="progress > 0" class="text-center">
        <div class="progress">
          <div
            class="progress-bar"
            role="progressbar"
            :style="{ width: progress + '%' }"
          >
            {{ progress }}%
          </div>
        </div>

        <div class="mt-2 text-primary">
          Downloading...
          {{ formatBytes(loaded) }} /
          {{ formatBytes(total) }}
          ({{ formatBytes(speed) }}/s)
        </div>

        <button
          class="btn btn-danger btn-sm mt-2"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
      </div>

      <div v-else class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `,
});
