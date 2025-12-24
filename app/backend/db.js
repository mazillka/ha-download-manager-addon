import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3").verbose();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "ha-download-manager.db");

const db = new sqlite3.Database(dbPath);

export const initDB = () => {
    db.serialize(() => {
        db.run("CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT, size INTEGER, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
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

export const addHistory = (filename, size) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO history (filename, size) VALUES (?, ?)", [filename, size], function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve(this.lastID);
            }
        });
    });
};

export const saveTask = (task) => {
    return new Promise((resolve, reject) => {
        const { id, filename, url, status, progress, loaded, total, startTime, error } = task;
        db.run(`INSERT OR REPLACE INTO tasks (id, filename, url, status, progress, loaded, total, startTime, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, filename, url, status, progress, loaded, total, startTime, error],
            (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            }
        );
    });
};

export const deleteTask = (id) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM tasks WHERE id = ?", [id], (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
};

export const getAllTasks = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tasks", (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};

export const getHistory = (limit = 50) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM history ORDER BY id DESC LIMIT ?", [limit], (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};

export const getTask = (id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, row) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};