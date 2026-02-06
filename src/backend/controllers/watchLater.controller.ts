import type { Request, Response, NextFunction } from "express";
import { WatchLaterService } from "../services";
import { asyncHandler } from "../utils";

export const GetAll = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const list = await WatchLaterService.GetAll(page, limit);
    res.json({ list });
  },
);

export const Add = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const watchLater = req.body;

    await WatchLaterService.Add(watchLater);

    res.json({ watchLater });
  },
);

export const Delete = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { url } = req.body;

    await WatchLaterService.Delete(url);

    res.json({ success: true });
  },
);

export const GetUrls = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const list = await WatchLaterService.GetUrls();
    res.json({ list });
  },
);
