import type { DownloadTask } from "./interfaces/";
import type { WatchLater } from "../common/interfaces";

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
};

async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  const showLoading = options?.showLoading !== false; // default = true

  try {
    if (showLoading) {
      setLoading(true);
    }

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } finally {
    if (showLoading) setLoading(false);
  }
}

export const api = {
  getConfigs: () => request<{ list: any[] }>("api/configs"),

  saveConfigs: (configs: any[]) =>
    request("api/configs", {
      method: "POST",
      body: JSON.stringify({ configs }),
    }),

  getSearchResults: (url: string) =>
    request<{ list: any[] }>("api/search", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  getDetails: (payload: any) =>
    request<{ details: any }>("api/parse", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  addWatchLater: (watchLater: WatchLater) =>
    request("api/watchLater", {
      method: "POST",
      body: JSON.stringify(watchLater),
    }),

  deleteWatchLater: (pageUrl: string) =>
    request("api/watchLater", {
      method: "DELETE",
      body: JSON.stringify({ pageUrl: pageUrl }),
    }),

  getWatchLater: () =>
    request<{ list: any[] }>("api/watchLater", {
      method: "GET",
      showLoading: false,
    }),

  getServerDownloads: () =>
    request<{ list: DownloadTask[] }>("api/downloads", {
      method: "GET",
      showLoading: false,
    }),

  downloadToServer: (payload: any) =>
    request("api/download", {
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
};
