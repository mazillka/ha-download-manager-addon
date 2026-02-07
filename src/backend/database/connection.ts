import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { config } from "../config";

// TODO: move to fsService
if (!fs.existsSync(config.dbFolderPath)) {
  fs.mkdirSync(config.dbFolderPath, { recursive: true });
}

const dbFile = path.join(config.dbFolderPath, config.dbFileName);

const verbose = sqlite3.verbose();
export const db = new verbose.Database(dbFile);
