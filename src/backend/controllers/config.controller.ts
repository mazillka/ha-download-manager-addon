import type { Request, Response } from "express";
import { ConfigService } from "../services";

export const GetAll = async (req: Request, res: Response) => {
  const list = await ConfigService.GetAll();
  res.json({ list });
};

export const AddOrUpdateAll = async (req: Request, res: Response) => {
  const { list } = req.body;

  await ConfigService.AddOrUpdateAll(list);
  res.json({ list });
};
