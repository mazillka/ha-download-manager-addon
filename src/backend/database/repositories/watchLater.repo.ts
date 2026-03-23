import { db } from "../connection";
import type { WatchLater } from "../../../common/interfaces";

export const addWatchLater = async (watchLater: WatchLater): Promise<void> => {
  const stmt = db.prepare(
    "INSERT INTO watch_later (url, name, year, image, category) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(
    watchLater.url,
    watchLater.name,
    watchLater.year,
    watchLater.image,
    watchLater.category
  );
};

export const deleteWatchLater = async (url: string): Promise<void> => {
  const stmt = db.prepare("DELETE FROM watch_later WHERE url = ?");
  stmt.run(url);
};

export const getAllWatchLater = async (
  limit: number = 20,
  offset: number = 0,
): Promise<WatchLater[]> => {
  const stmt = db.prepare("SELECT * FROM watch_later LIMIT ? OFFSET ?");
  return stmt.all(limit, offset) as WatchLater[];
};

export const getAllWatchLaterUrls = async (): Promise<string[]> => {
  const stmt = db.prepare("SELECT url FROM watch_later");
  const rows = stmt.all() as { url: string }[];
  return rows.map((r) => r.url);
};
