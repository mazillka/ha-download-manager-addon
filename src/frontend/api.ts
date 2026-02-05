import type {
  Config,
  DownloadTask,
  ParseResult,
  SearchResult,
  WatchLater,
} from "../common/interfaces";
import { LRUCache } from "./composables/useCache";

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

type RequestOptions = Omit<RequestInit, "cache"> & {
  showLoading?: boolean;
  controller?: AbortController;
  timeout?: number;
  retries?: number;
  cache?: boolean;
};

// API Configuration
const API_BASE_URL = "";
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 2;

// Request cache (5 minute TTL, max 50 entries)
const requestCache = new LRUCache<string, any>(50, 5 * 60 * 1000);

// In-flight request tracking for deduplication
const inflightRequests = new Map<string, Promise<any>>();

/**
 * Generate cache key from URL and options
 */
function getCacheKey(url: string, options?: RequestOptions): string {
  const method = options?.method || "GET";
  const body = options?.body || "";
  return `${method}:${url}:${body}`;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  const showLoading = options?.showLoading !== false;
  const timeout = options?.timeout || DEFAULT_TIMEOUT;
  const maxRetries = options?.retries ?? DEFAULT_RETRIES;
  const useCache =
    options?.cache !== false && (options?.method || "GET") === "GET";
  const fullUrl = `${API_BASE_URL}${url}`;
  const cacheKey = getCacheKey(fullUrl, options);

  // Check cache for GET requests
  if (useCache && requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey) as T;
  }

  // Check for in-flight request (deduplication)
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey) as Promise<T>;
  }

  const controller = options?.controller || new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const executeRequest = async (attempt: number = 0): Promise<T> => {
    try {
      if (showLoading && attempt === 0) setLoading(true);

      // Extract custom options that shouldn't be passed to fetch
      const {
        showLoading: _,
        timeout: __,
        retries: ___,
        cache: ____,
        ...fetchOptions
      } = options || {};

      const res = await fetch(fullUrl, {
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        ...fetchOptions,
      });

      if (!res.ok) {
        // Retry on server errors (5xx) or specific client errors
        if ((res.status >= 500 || res.status === 429) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          await sleep(delay);
          return executeRequest(attempt + 1);
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Cache successful GET requests
      if (useCache) {
        requestCache.set(cacheKey, data);
      }

      return data;
    } catch (error: any) {
      // Retry on network errors
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }

      if (attempt < maxRetries && error.message.includes("fetch")) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delay);
        return executeRequest(attempt + 1);
      }

      throw error;
    }
  };

  // Track in-flight request
  const requestPromise = executeRequest().finally(() => {
    clearTimeout(timeoutId);
    inflightRequests.delete(cacheKey);
    if (showLoading) setLoading(false);
  });

  inflightRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

/**
 * Invalidate cache for specific patterns
 */
export function invalidateCache(pattern?: string) {
  if (!pattern) {
    requestCache.clear();
    return;
  }

  // Clear cache entries matching pattern
  // Note: LRUCache doesn't expose keys(), so we clear all for now
  // In production, consider using a more sophisticated cache
  requestCache.clear();
}

export const api = {
  getConfigs: () => request<{ list: Config[] }>("api/configs/get-all"),

  saveConfigs: (list: Config[]) =>
    request<{ list: Config[] }>("api/configs/add-or-update-all", {
      method: "POST",
      body: JSON.stringify({ list }),
      cache: false,
    }).then((result) => {
      invalidateCache("configs");
      return result;
    }),

  getSearchResults: (payload: object) =>
    request<{ list: SearchResult[] }>("api/search", {
      method: "POST",
      body: JSON.stringify(payload),
      cache: false,
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
      cache: false,
    }).then((result) => {
      invalidateCache("watch-later");
      return result;
    }),

  deleteWatchLater: (url: string) =>
    request("api/watch-later/delete", {
      method: "DELETE",
      body: JSON.stringify({ url: url }),
      cache: false,
    }).then((result) => {
      invalidateCache("watch-later");
      return result;
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
      cache: false,
    }).then((result) => {
      invalidateCache("downloads");
      return result;
    }),

  cancelServerDownload: (id: string) =>
    request(`api/downloads/${id}/cancel`, {
      method: "POST",
      cache: false,
    }),

  pauseServerDownload: (id: string) =>
    request(`api/downloads/${id}/pause`, {
      method: "POST",
      cache: false,
    }),

  resumeServerDownload: (id: string) =>
    request(`api/downloads/${id}/resume`, {
      method: "POST",
      cache: false,
    }),

  deleteServerDownload: (id: string, removeFile: boolean) =>
    request(`api/downloads/${id}/delete?removeFile=${removeFile}`, {
      method: "DELETE",
      cache: false,
    }).then((result) => {
      invalidateCache("downloads");
      return result;
    }),
};
