import { db } from "../connection";
import type { HistoryItem } from "../../../common/interfaces";

export const addHistory = (filename: string, size: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO history (filename, size) VALUES (?, ?)",
      [filename, size],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
};

export const getAllHistory = (limit = 50): Promise<HistoryItem[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM history ORDER BY id DESC LIMIT ?",
      [limit],
      (err, rows: HistoryItem[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
};
