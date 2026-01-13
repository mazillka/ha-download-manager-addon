import type { Request, Response } from "express";
import { DbService } from "../services";

export const getAll = async (req: Request, res: Response) => {
  const list = await DbService.getAllConfig();
  res.json({ list });
};

export const addOrUpdate = async (req: Request, res: Response) => {
  const { list } = req.body;

  try {
    await DbService.addOrUpdateConfigs(list);
    res.json({ list });
  } catch (error) {
    console.error("Error saving config:", error);
    res.status(500).json({ error: "Failed to save configs" });
  }
};
