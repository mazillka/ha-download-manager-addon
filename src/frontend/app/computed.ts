import { ConfigKey } from "../../common/enums";

export const computed: Record<string, any> = {
  activeServerDownloads(): number {
    return this.serverDownloads.filter(
      (x: any) => x.status === "downloading" || x.status === "pending"
    ).length;
  },

  watchLaterCount(): number {
    return this.watchLaterList.length;
  },

  baseUrl(): string {
    return (
      this.configs.find((x: any) => x.key === ConfigKey.BaseUrl)?.value || ""
    );
  },
};
