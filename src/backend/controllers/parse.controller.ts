import type { Request, Response } from "express";
import { ParseService } from "../services";

export const Search = async (req: Request, res: Response) => {
  const { url } = req.body;

  const list = await ParseService.Search(url);
  res.json({ list });
};

export const GetDetails = async (req: Request, res: Response) => {
  const { url, data_translator_id } = req.body;

  const details = await ParseService.GetDetails(url, data_translator_id);
  res.json({ details });
};
