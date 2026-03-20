import type { Request, Response, NextFunction } from "express";
import { ParseService } from "../services";
import { asyncHandler } from "../utils";

export const Search = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // TODO: specify proper TYPE for return
    const { query, filter } = req.body;

    let list;

    if (query) {
      list = await ParseService.Search(query);
    }

    if (filter) {
      list = await ParseService.Filter(filter);
    }

    res.json({ list });
  },
);

export const GetDetails = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // TODO: specify proper TYPE for return
    const { url, translator, season, episode } = req.body;

    const details = await ParseService.GetDetails(
      url,
      translator,
      season,
      episode,
    );

    res.json({ details });
  },
);
