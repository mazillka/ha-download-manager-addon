import { db } from "../connection";
import type { WatchLater } from "../../../common/interfaces";

export const addWatchLater = (watchLater: WatchLater): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO watch_later (url, name, year, image) VALUES (?, ?, ?, ?)",
      [watchLater.url, watchLater.name, watchLater.year, watchLater.image],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
};

export const deleteWatchLater = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM watch_later WHERE url = ?", [url], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const getAllWatchLater = (
  limit: number = 20,
  offset: number = 0,
): Promise<WatchLater[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM watch_later LIMIT ? OFFSET ?",
      [limit, offset],
      (err, rows: WatchLater[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      },
    );
  });
};

export const getAllWatchLaterUrls = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    db.all("SELECT url FROM watch_later", (err, rows: { url: string }[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map((r) => r.url));
      }
    });
  });
};
