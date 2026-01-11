import type { Request, Response } from "express";
import { DbService } from "../services";

export const getAll = async (req: Request, res: Response) => {
  const configs = await DbService.getAllConfig();
  res.json({ configs });
};

export const addOrUpdate = async (req: Request, res: Response) => {
  const { configs } = req.body;

  try {
    await DbService.addOrUpdateConfigs(configs);
    res.json({ configs });
  } catch (error) {
    console.error("Error saving config:", error);
    res.status(500).json({ error: "Failed to save configs" });
  }
};
