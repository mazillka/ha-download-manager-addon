import type { Request, Response, NextFunction } from "express";
import { WatchLaterService } from "../services";
import { asyncHandler } from "../utils";

export const GetAll = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const list = await WatchLaterService.GetAll();
    res.json({ list });
  },
);

export const Add = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const watchLater = req.body;

    await WatchLaterService.Add(watchLater);

    await WatchLaterService.Sync();

    res.json({ watchLater });
  },
);

export const Delete = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { pageUrl } = req.body;

    await WatchLaterService.Delete(pageUrl);

    await WatchLaterService.Sync();

    res.json({ success: true });
  },
);

export const Sync = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await WatchLaterService.Sync();
    res.json({ success: true });
  },
);
