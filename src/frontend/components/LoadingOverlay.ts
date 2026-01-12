import { defineComponent } from "vue";
import { formatBytes } from "../utils/format";

export default defineComponent({
  name: "LoadingOverlay",
  emits: ["cancel-local-download"],
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
    onCancel() {
      this.$emit("cancel-local-download");
    },
    formatBytes
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
          @click="onCancel()"
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
