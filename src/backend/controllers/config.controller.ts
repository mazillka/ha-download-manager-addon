import type { Request, Response } from "express";
import { ConfigService } from "../services";
import { asyncHandler } from "../utils";

export const GetAll = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const list = await ConfigService.GetAll();
    res.json({ list });
  },
);

export const AddOrUpdateAll = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { list } = req.body;

    await ConfigService.AddOrUpdateAll(list);
    res.json({ list });
  },
);
