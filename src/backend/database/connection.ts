import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { config } from "../config";

// TODO: move to fsService
if (!fs.existsSync(config.dbFolderPath)) {
  fs.mkdirSync(config.dbFolderPath, { recursive: true });
}

const dbFile = path.join(config.dbFolderPath, config.dbFileName);

export const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
