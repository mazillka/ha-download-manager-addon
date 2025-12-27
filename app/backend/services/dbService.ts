import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import type { Task, HistoryItem } from "../interfaces/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "ha-download-manager.db");

const verbose = sqlite3.verbose();
const db = new verbose.Database(dbPath);

export const initDB = (): void => {
  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT, size INTEGER, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            filename TEXT,
            url TEXT,
            status TEXT,
            progress INTEGER,
            loaded INTEGER,
            total INTEGER,
            startTime INTEGER,
            error TEXT
        )`);
  });
};

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

export const saveTask = (task: Task): Promise<void> => {
  return new Promise((resolve, reject) => {
    const {
      id,
      filename,
      url,
      status,
      progress,
      loaded,
      total,
      startTime,
      error,
    } = task;
    db.run(
      `INSERT OR REPLACE INTO tasks (id, filename, url, status, progress, loaded, total, startTime, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, filename, url, status, progress, loaded, total, startTime, error],
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

export const deleteTask = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM tasks WHERE id = ?", [id], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const getAllTasks = (): Promise<Task[]> => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM tasks", (err, rows: Task[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getHistory = (limit = 50): Promise<HistoryItem[]> => {
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

export const getTask = (id: string): Promise<Task | undefined> => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, row: Task) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export default {
  initDB,
  addHistory,
  saveTask,
  deleteTask,
  getAllTasks,
  getHistory,
  getTask,
};
