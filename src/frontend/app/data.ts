import type {
  Config,
  DownloadTask,
  ParseResult,
  SearchResult,
  WatchLater,
} from "../../common/interfaces";

import { tabs } from "./tabs";
import { tabUrls } from "./tabUrls";

export const data: Record<string, any> = {
  data() {
    return {
      isLoading: false,
      query: "",
      searchResults: [] as SearchResult[],

      modal: {
        item: null as ParseResult | null,
        url: null as string | null,
        init(data: ParseResult, url: string) {
          this.item = data;
          this.url = url;
        },
      },

      serverPollInterval: null as number | null,
      activeTab: "search",

      tabs: tabs,
      tabUrls: tabUrls,

      configs: [] as Config[],
      serverDownloads: [] as DownloadTask[],
      watchLaterList: [] as WatchLater[],
    };
  },
};
