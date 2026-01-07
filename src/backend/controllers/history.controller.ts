import type { Request, Response } from "express";
import { DbService } from "../services";

export const getHistory = async (req: Request, res: Response) => {
  const rows = await DbService.getHistory();
  res.json(rows);
};
