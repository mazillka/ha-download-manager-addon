import { db } from "../connection";
import type { Config } from "../../../common/interfaces";
import { ConfigKey } from "../../../common/enums";

export const getAllConfigs = async (): Promise<Config[]> => {
  const stmt = db.prepare("SELECT * FROM config");
  return stmt.all() as Config[];
};

export const addOrUpdateConfigs = async (configs: Config[]): Promise<void> => {
  const stmt = db.prepare("INSERT OR REPLACE INTO config (key, value, description) VALUES (?, ?, ?)");
  const insertMany = db.transaction((configsList: Config[]) => {
    for (const config of configsList) {
      stmt.run(config.key, config.value, config.description);
    }
  });
  insertMany(configs);
};

export const getConfig = async (key: ConfigKey): Promise<string | null> => {
  const stmt = db.prepare("SELECT value FROM config WHERE key = ?");
  const row = stmt.get(key) as any;
  return row ? row.value : null;
};
