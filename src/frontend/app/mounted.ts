import { subscribeLoading } from "../api";

export const mounted: Record<string, any> = {
  mounted() {
    subscribeLoading((v) => (this.isLoading = v));

    this.getConfigs();
    this.getServerDownloads();
    this.getWatchLaterList();

    this.serverPollInterval = window.setInterval(async () => {
      await Promise.all([this.getServerDownloads(), this.getWatchLaterList()]);
    }, 3000);
  },
};
