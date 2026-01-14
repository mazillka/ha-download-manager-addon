import { db } from "../connection";
import type { Task } from "../../../common/interfaces";

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
