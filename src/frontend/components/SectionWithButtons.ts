import { defineComponent } from "vue";

export default defineComponent({
  name: "SectionWithButtons",
  
  props: {
    title: {
      type: String,
      required: true,
    },
    items: {
      type: Array,
      required: true,
    },
    replaceFrom: {
      type: String,
      default: "",
    },
    replaceTo: {
      type: String,
      default: "",
    },
  },

  methods: {
    formatName(name: string) {
      if (!this.replaceFrom) {
        return name;
      }
      return name.replace(this.replaceFrom, this.replaceTo);
    },
  },

  template: `
        <div v-if="items && items.length">
            <h6>{{ title }}</h6>

            <div class="d-flex flex-wrap mb-3">
                <button
                    v-for="(item, index) in items"
                    :key="index + '-' + item.url"
                    class="btn btn-sm me-2 mb-2"
                    :class="item.active ? 'btn-success' : 'btn-outline-primary'"
                    :disabled="item.active"
                    @click="$emit('parse', item)">
                    {{ formatName(item.name) }}
                </button>
            </div>
        </div>
    `,
});
