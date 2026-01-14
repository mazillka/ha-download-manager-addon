import { api } from "../api";
import { formatBytes } from "../utils/format";
import { showWarningDialog, showSuccessDialog } from "../utils/dialogs";

export const methods: Record<string, any> = {
  formatBytes,

  async onSelectTab(tabId: string) {
    this.activeTab = tabId;
    this.query = "";
    this.searchResults = [];

    if (tabId === "search") return;
    if (tabId === "settings") return this.getConfigs();
    if (tabId === "watch_later") return this.getWatchLaterList();

    const filter = this.tabUrls[tabId];
    if (filter) {
      await this.getSearchResults(`${this.baseUrl}/${filter}`);
    }
  },

  async onSearch() {
    if (!this.query) return;

    const searchUrl = `${
      this.baseUrl
    }/search/?do=search&subaction=search&q=${encodeURIComponent(this.query)}`;
    await this.getSearchResults(searchUrl);
  },

  async onClear() {
    this.query = "";
    this.searchResults = [];
  },

  async getSearchResults(url: string) {
    const { list } = await api.getSearchResults(url);
    this.searchResults = list;
  },

  async getDetails(url: string, data_translator_id?: string | null) {
    const { details } = await api.getDetails({ url, data_translator_id });
    this.modal.init(details, url);
  },

  async getConfigs() {
    const { list } = await api.getConfigs();
    this.configs = list;
  },

  async saveConfig() {
    await api.saveConfigs(this.configs);
  },

  async getServerDownloads() {
    const { list } = await api.getServerDownloads();
    this.serverDownloads = list;
  },

  async getWatchLaterList() {
    const { list } = await api.getWatchLater();
    this.watchLaterList = list;
  },

  async removeFromWatchLater(pageUrl: string) {
    const ok = await showWarningDialog(
      "Are you sure?",
      "Remove from Watch Later?"
    );
    if (ok) {
      await api.deleteWatchLater(pageUrl);
      this.getWatchLaterList();
    }
  },

  async cancelServerDownload(id: string) {
    const isConfirmed = await showWarningDialog(
      "Are you sure?",
      "You won't be able to revert this!"
    );
    if (!isConfirmed) return;
    await api.cancelServerDownload(id);
  },

  async pauseServerDownload(id: string) {
    await api.pauseServerDownload(id);
  },

  async resumeServerDownload(id: string) {
    await api.resumeServerDownload(id);
  },

  async deleteServerDownload(id: string) {
    const isConfirmed1 = await showWarningDialog(
      "Are you sure?",
      "You want to delete this task?"
    );

    if (!isConfirmed1) return;

    const isConfirmed2 = await showWarningDialog(
      "Are you sure?",
      "Also delete file from disk?"
    );

    if (!isConfirmed2) return;

    await api.deleteServerDownload(id, isConfirmed2);
  },

  async handleGetDetails(
    t: string | { url?: string; data_translator_id?: string }
  ) {
    if (typeof t === "string") {
      await this.getDetails(t);
    } else if (t.url) {
      await this.getDetails(t.url);
    } else {
      await this.getDetails(this.modal.url!, t.data_translator_id);
    }
  },
};
