import { addOrUpdateConfigs, getAllConfigs } from "../db/";
import type { Config } from "../../common/interfaces";

export const GetAll = async (): Promise<Config[]> => {
  return await getAllConfigs();
};

export const AddOrUpdateAll = async (configs: Config[]): Promise<void> => {
  await addOrUpdateConfigs(configs);
};

export default { GetAll, AddOrUpdateAll };
