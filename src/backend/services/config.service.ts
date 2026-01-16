import { addOrUpdateConfigs, getAllConfigs, getConfig } from "../database/";
import type { Config } from "../../common/interfaces";
import { ConfigKey } from "../../common/enums";

export const GetAll = async (): Promise<Config[]> => {
  return await getAllConfigs();
};

export const Get = async (configKey: ConfigKey): Promise<string | null> => {
  return await getConfig(configKey);
};

export const AddOrUpdateAll = async (configs: Config[]): Promise<void> => {
  await addOrUpdateConfigs(configs);
};

export default { GetAll, Get, AddOrUpdateAll };
