import { defineComponent } from "vue";
import { showSuccessDialog } from "../utils/dialogs";
import { api } from "../api";

export default defineComponent({
  name: "AddToWatchLaterButton",

  props: {
    title: {
      type: String,
      required: true,
    },
    pageUrl: {
      type: String,
      required: true,
    },
    posterUrl: {
      type: String,
      required: true,
    },
  },
  methods: {
    async addToWatchLater(item: any) {
      const payload = {
        title: this.title,
        pageUrl: this.pageUrl,
        posterUrl: this.posterUrl,
      } as object;

      await api.addWatchLater(payload);

      showSuccessDialog("Added to Watch Later");
    },
  },
  template: `
        <button class="btn btn-outline-primary mt-2" @click.stop="addToWatchLater"
            title="Add to Watch Later">Add to Watch Later</button>
    `,
});
