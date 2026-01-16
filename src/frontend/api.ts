import type {
  Config,
  DownloadTask,
  ParseResult,
  SearchResult,
  WatchLater,
} from "../common/interfaces";

type LoadingListener = (value: boolean) => void;

let loading = false;
const listeners: LoadingListener[] = [];

export function subscribeLoading(cb: LoadingListener) {
  listeners.push(cb);
  cb(loading); // initial state
}

function setLoading(value: boolean) {
  loading = value;
  listeners.forEach((l) => l(value));
}

type RequestOptions = RequestInit & {
  showLoading?: boolean;
  controller?: AbortController;
};

async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  const showLoading = options?.showLoading !== false;

  try {
    if (showLoading) setLoading(true);

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      signal: options?.controller?.signal,
      ...options,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return await res.json();
  } finally {
    if (showLoading) setLoading(false);
  }
}

export const api = {
  getConfigs: () => request<{ list: Config[] }>("api/configs"),

  saveConfigs: (list: Config[]) =>
    request("api/configs", {
      method: "POST",
      body: JSON.stringify({ list }),
    }),

  getSearchResults: (url: string) =>
    request<{ list: SearchResult[] }>("api/search", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  getDetails: (payload: object) =>
    request<{ details: ParseResult }>("api/getDetails", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addWatchLater: (payload: object) =>
    request("api/watchLater", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteWatchLater: (pageUrl: string) =>
    request("api/watchLater", {
      method: "DELETE",
      body: JSON.stringify({ pageUrl: pageUrl }),
    }),

  getWatchLater: () =>
    request<{ list: WatchLater[] }>("api/watchLater", {
      method: "GET",
      showLoading: false,
    }),

  getServerDownloads: () =>
    request<{ list: DownloadTask[] }>("api/downloads", {
      method: "GET",
      showLoading: false,
    }),

  downloadToServer: (payload: object) =>
    request("api/downloads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  cancelServerDownload: (id: string) =>
    request(`api/downloads/${id}/cancel`, {
      method: "POST",
    }),

  pauseServerDownload: (id: string) =>
    request(`api/downloads/${id}/pause`, {
      method: "POST",
    }),

  resumeServerDownload: (id: string) =>
    request(`api/downloads/${id}/resume`, {
      method: "POST",
    }),

  deleteServerDownload: (id: string, removeFile: boolean) =>
    request(`api/downloads/${id}?removeFile=${removeFile}`, {
      method: "DELETE",
    }),

  syncWatchLater: (list: WatchLater[]) =>
    request("api/watchLater/sync", {
      method: "POST",
      body: JSON.stringify({ list }),
      showLoading: false,
    }),
};
