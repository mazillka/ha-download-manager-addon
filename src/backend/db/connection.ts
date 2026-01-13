import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "ha-download-manager.db");

const verbose = sqlite3.verbose();
export const db = new verbose.Database(dbPath);
