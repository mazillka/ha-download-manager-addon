import type { Request, Response } from "express";
import { WatchLaterService } from "../services";

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
