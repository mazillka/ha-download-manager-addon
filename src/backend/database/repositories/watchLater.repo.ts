import { db } from "../connection";
import type { WatchLater } from "../../../common/interfaces";

export const addWatchLater = (watchLater: WatchLater): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO watch_later (pageUrl, title, posterUrl) VALUES (?, ?, ?)",
      [watchLater.pageUrl, watchLater.title, watchLater.posterUrl],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

export const deleteWatchLater = (pageUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM watch_later WHERE pageUrl = ?", [pageUrl], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const getAllWatchLater = (): Promise<WatchLater[]> => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM watch_later", (err, rows: WatchLater[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};