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
  getConfigs: () => request<{ list: Config[] }>("api/configs/get-all"),

  saveConfigs: (list: Config[]) =>
    request<{ list: Config[] }>("api/configs/add-or-update-all", {
      method: "POST",
      body: JSON.stringify({ list }),
    }),

  getSearchResults: (payload: object) =>
    request<{ list: SearchResult[] }>("api/search", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getDetails: (payload: object) =>
    request<{ details: ParseResult }>("api/get-details", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getStreams: (payload: object) =>
    request<{ streams: any }>("api/get-streams", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addWatchLater: (payload: object) =>
    request("api/watch-later/add", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteWatchLater: (url: string) =>
    request("api/watch-later/delete", {
      method: "DELETE",
      body: JSON.stringify({ url: url }),
    }),

  getWatchLater: () =>
    request<{ list: WatchLater[] }>("api/watch-later/get-all", {
      method: "GET",
    }),

  getServerDownloads: () =>
    request<{ list: DownloadTask[] }>("api/downloads/get-all", {
      method: "GET",
    }),

  downloadToServer: (payload: object) =>
    request("api/downloads/add", {
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
    request(`api/downloads/${id}/delete?removeFile=${removeFile}`, {
      method: "DELETE",
    })
};
