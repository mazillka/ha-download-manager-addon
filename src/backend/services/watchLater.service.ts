import { deleteWatchLater, addWatchLater, getAllWatchLater } from "../database";
import type { WatchLater } from "../../common/interfaces";
import { ConfigService } from "./";
import { ConfigKey } from "../../common/enums";
import fs from "fs";
import path from "path";

export const GetAll = async (): Promise<WatchLater[]> => {
  return await getAllWatchLater();
};

export const Add = async (watchLater: WatchLater): Promise<void> => {
  await addWatchLater(watchLater);
};

export const Delete = async (pageUrl: string): Promise<void> => {
  await deleteWatchLater(pageUrl);
};

export const Sync = async (): Promise<void> => {
  const downloadPath = await ConfigService.Get(ConfigKey.DownloadPath);
  if (!downloadPath) {
    return;
  }

  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  const dest = path.join(downloadPath, "watch-later.json");

  const dbList = await GetAll();
  const localList = getData(dest);

  // TOOD: fix bug when can't delete last item because it still exist in file and restores every time

  if (dbList.length == 0) {
    localList.forEach(async (watchLater: WatchLater) => {
      await Add(watchLater);
    });
  } else {
    setData(dest, dbList);
  }
};

function getData(fileName: string) {
  if (!fs.existsSync(fileName)) return [];
  return JSON.parse(fs.readFileSync(fileName, "utf-8"));
}

function setData(fileName: string, data: WatchLater[]) {
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2), "utf-8");
}

export default { GetAll, Add, Delete, Sync };
