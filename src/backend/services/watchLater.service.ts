import { deleteWatchLater, addWatchLater, getAllWatchLater } from "../database";
import type { WatchLater } from "../../common/interfaces";

export const GetAll = async (): Promise<WatchLater[]> => {
  return await getAllWatchLater();
};

export const Add = async (watchLater: WatchLater): Promise<void> => {
  await addWatchLater(watchLater);
};

export const Delete = async (pageUrl: string): Promise<void> => {
  await deleteWatchLater(pageUrl);
};

export default { GetAll, Add, Delete };
