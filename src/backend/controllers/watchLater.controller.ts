import type { Request, Response } from "express";
import { WatchLaterService, ConfigService } from "../services";
import { ConfigKey } from "../../common/enums";
import fs from "fs";
import path from "path";

export const GetAll = async (req: Request, res: Response) => {
  const list = await WatchLaterService.GetAll();
  res.json({ list });
};

export const Add = async (req: Request, res: Response) => {
  const watchLater = req.body;

  await WatchLaterService.Add(watchLater);
  res.json({ watchLater });
};

export const Delete = async (req: Request, res: Response) => {
  const { pageUrl } = req.body;

  await WatchLaterService.Delete(pageUrl);
  res.json({ success: true });
};

// TODO: move all logic to service
export const Sync = async (req: Request, res: Response) => {
  const { list } = req.body;

  const FILE = "watchLater.json";

  const downloadPath = await ConfigService.Get(ConfigKey.DownloadPath);
  if (!downloadPath) {
    return;
  }

  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  const dest = path.join(downloadPath, FILE);

  const dbList = await WatchLaterService.GetAll();
  const localList = getData(dest);

  if (dbList.length == 0) {
    localList.forEach(async (watchLater) => {
      await WatchLaterService.Add(watchLater);
    });
  } else {
    setData(dest, dbList);
  }

  res.json({ success: true });
};

function getData(fileName: string) {
  if (!fs.existsSync(fileName)) return [];
  return JSON.parse(fs.readFileSync(fileName, "utf-8"));
}

function setData(fileName: string, data) {
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2), "utf-8");
}
