import { db } from "./connection";
import { ConfigKey } from "../../common/enums";
import type { Config } from "../../common/interfaces";

export const initDB = (): void => {
  db.serialize(() => {
    // create history table
    db.run(
      "CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT, size INTEGER, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );

    // create tasks table
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

    // create config table
    db.run(
      "CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT, description TEXT)"
    );

    // create watch_later table
    db.run(
      "CREATE TABLE IF NOT EXISTS watch_later (url TEXT PRIMARY KEY, name TEXT, year TEXT, image TEXT)"
    );

    insertDefaultConfig();
  });
};

const defaultConfigs: Config[] = [
  {
    key: ConfigKey.BaseUrl,
    value: "",
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

  defaultConfigs.forEach((c) => {
    stmt.run([c.key, c.value, c.description]);
  });

  stmt.finalize();
};
