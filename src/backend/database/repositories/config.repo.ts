import { db } from "../connection";
import type { Config } from "../../../common/interfaces";
import { ConfigKey } from "../../../common/enums";

export const getAllConfigs = (): Promise<Config[]> => {
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

export const getConfig = (key: ConfigKey): Promise<string | null> => {
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
