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
