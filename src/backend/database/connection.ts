import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { config } from "../config";

// TODO: move to fsService
if (!fs.existsSync(config.shareFolderPath)) {
  fs.mkdirSync(config.shareFolderPath, { recursive: true });
}

const dbFile = path.join(config.shareFolderPath, config.dbFileName);

const verbose = sqlite3.verbose();
export const db = new verbose.Database(dbFile);
