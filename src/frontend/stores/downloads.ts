import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api";
import { showConfirm } from "../utils/alerts";

export const useDownloadsStore = defineStore("downloads", () => {
  const list = ref<any[]>([]);
  const page = ref(1);

  async function fetch(reset: boolean = false) {
    if (reset) {
      page.value = 1;
      list.value = [];
    }

    const { list: fetched } = await api.getServerDownloads(page.value);

    if (reset) {
      list.value = fetched;
    } else {
      list.value = [...list.value, ...fetched];
    }
  }

  async function loadMore() {
    page.value++;
    await fetch(false);
  }

  async function cancel(id: string) {
    const ok = await showConfirm({
      title: "Cancel Server Download",
      text: "Are you sure you want to cancel server download?",
    });
    if (!ok) return;

    await api.cancelServerDownload(id);
    await fetch();
  }

  async function pause(id: string) {
    await api.pauseServerDownload(id);
    await fetch();
  }

  async function resume(id: string) {
    await api.resumeServerDownload(id);
    await fetch();
  }

  async function remove(id: string) {
    const ok1 = await showConfirm({
      title: "Delete Server Download",
      text: "Are you sure you want to delete server download?",
    });
    if (!ok1) return;

    const ok2 = await showConfirm({
      title: "Delete File From Disk",
      text: "Are you sure you want to delete file from disk?",
    });

    await api.deleteServerDownload(id, ok2);
    await fetch();
  }

  return {
    list,
    page,
    fetch,
    loadMore,
    cancel,
    pause,
    resume,
    remove,
  };
});
