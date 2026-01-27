import type { Request, Response, NextFunction } from "express";
import { ParseService } from "../services";
import { asyncHandler } from "../utils";

export const Search = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { url } = req.body;

    const list = await ParseService.Search(url);
    res.json({ list });
  },
);

export const GetDetails = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { url, data_translator_id } = req.body;

    const details = await ParseService.GetDetails(url, data_translator_id);
    res.json({ details });
  },
);
