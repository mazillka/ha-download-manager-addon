import {
  deleteWatchLater,
  addWatchLater,
  getAllWatchLater,
  getAllWatchLaterUrls,
} from "../database";
import type { WatchLater } from "../../common/interfaces";

export const GetAll = async (
  page: number = 1,
  limit: number = 20,
): Promise<WatchLater[]> => {
  const offset = (page - 1) * limit;
  return await getAllWatchLater(limit, offset);
};

export const Add = async (watchLater: WatchLater): Promise<void> => {
  await addWatchLater(watchLater);
};

export const Delete = async (pageUrl: string): Promise<void> => {
  await deleteWatchLater(pageUrl);
};

export const GetUrls = async (): Promise<string[]> => {
  return await getAllWatchLaterUrls();
};

export default { GetAll, Add, Delete, GetUrls };
