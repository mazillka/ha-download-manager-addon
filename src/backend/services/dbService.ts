import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import type { Task, HistoryItem } from "../interfaces";
import type { Config } from "../../common/interfaces";
import { ConfigKey } from "../../common/enums";

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
    db.run(
      "CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT, description TEXT)"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS watch_later (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, pageUrl TEXT, posterUrl TEXT)"
    );

    insertDefaultConfig();
  });
};

interface WatchLater {
  title: string;
  pageUrl: string;
  posterUrl: string;
}

const defaultConfigs: Config[] = [
  {
    key: ConfigKey.BaseUrl,
    value: "https://hdrezka.me",
    description: "Base Site URL",
  },
  {
    key: ConfigKey.DownloadPath,
    value: "/media/DOWNLOADS",
    description: "Server Download Path",
  },
];

const insertDefaultConfig = (): void => {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO config (key, value, description) VALUES (?, ?, ?)`
  );

  defaultConfigs.forEach((config) => {
    stmt.run([config.key, config.value, config.description], (err) => {
      if (err) {
        return console.log(err.message);
      }
      console.log(
        `Row was added to the table: [${config.key}]: ${config.value} - ${config.description}`
      );
    });
  });

  stmt.finalize();
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

export const getConfigs = (): Promise<Config[]> => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM config", (err, rows: Config[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const addOrUpdateConfigs = (configs: Config[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    configs.forEach((config) => {
      db.run(
        "INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)",
        [config.key, config.value, config.description],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  });
};

export const getConfig = (key: string): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM config WHERE key = ?", [key], (err, row: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.value : null);
      }
    });
  });
};

export const addWatchLater = (watchLater: WatchLater): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO watch_later (title, pageUrl, posterUrl) VALUES (?, ?, ?)",
      [watchLater.title, watchLater.pageUrl, watchLater.posterUrl],
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

export default {
  initDB,
  addHistory,
  saveTask,
  deleteTask,
  getAllTasks,
  getHistory,
  getTask,
  getAllConfig: getConfigs,
  addOrUpdateConfigs,
  getConfig,
  addWatchLater,
  deleteWatchLater,
  getAllWatchLater,
};
