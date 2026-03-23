import { db } from "../connection";
import type { HistoryItem } from "../../../common/interfaces";

export const addHistory = async (filename: string, size: number): Promise<number> => {
  const stmt = db.prepare("INSERT INTO history (filename, size) VALUES (?, ?)");
  const info = stmt.run(filename, size);
  return info.lastInsertRowid as number;
};

export const getAllHistory = async (limit = 50): Promise<HistoryItem[]> => {
  const stmt = db.prepare("SELECT * FROM history ORDER BY id DESC LIMIT ?");
  return stmt.all(limit) as HistoryItem[];
};
