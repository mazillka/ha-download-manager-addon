import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api";
import type { Config } from "../../common/interfaces";

export const useSettingsStore = defineStore("settings", () => {
  const configs = ref<Config[]>([]);
  const loaded = ref(false);

  async function load() {
    const { list } = await api.getConfigs();
    configs.value = list;
    loaded.value = true;
  }

  async function save() {
    const { list } = await api.saveConfigs(configs.value);
    configs.value = list;
  }

  return {
    configs,
    loaded,
    load,
    save,
  };
});
