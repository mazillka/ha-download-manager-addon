import { db } from "../connection";
import type { Task } from "../../../common/interfaces";

export const saveTask = async (task: Task): Promise<void> => {
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
  
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO tasks (id, filename, url, status, progress, loaded, total, startTime, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  
  stmt.run(id, filename, url, status, progress, loaded, total, startTime, error);
};

export const deleteTask = async (id: string): Promise<void> => {
  const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  stmt.run(id);
};

export const getAllTasks = async (
  limit: number = 20,
  offset: number = 0,
): Promise<Task[]> => {
  const stmt = db.prepare("SELECT * FROM tasks LIMIT ? OFFSET ?");
  return stmt.all(limit, offset) as Task[];
};

export const getTask = async (id: string): Promise<Task | undefined> => {
  const stmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  return stmt.get(id) as Task | undefined;
};
