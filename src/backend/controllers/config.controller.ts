import type { Request, Response } from "express";
import { DbService } from "../services";

export const getConfigs = async (req: Request, res: Response) => {
  const configs = await DbService.getConfigs();
  res.json({ configs });
};

export const saveConfigs = async (req: Request, res: Response) => {
  const { configs } = req.body;

  try {
    await DbService.saveConfigs(configs);
    res.json({ configs });
  } catch (error) {
    console.error("Error saving config:", error);
    res.status(500).json({ error: "Failed to save configs" });
  }
};
