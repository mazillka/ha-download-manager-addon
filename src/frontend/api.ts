import type { DownloadTask } from "./interfaces/";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  getConfigs: () => request<{ configs: any[] }>("api/configs"),

  saveConfigs: (configs: any[]) =>
    request("api/configs", {
      method: "POST",
      body: JSON.stringify({ configs }),
    }),

  search: (url: string) =>
    request<any[]>("api/search", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  parse: (payload: any) =>
    request("api/parse", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getDownloads: () => request<DownloadTask[]>("api/downloads"),

  startDownload: (url: string, filename: string) =>
    request("api/download", {
      method: "POST",
      body: JSON.stringify({ url, filename }),
    }),
};
