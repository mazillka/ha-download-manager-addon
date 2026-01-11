import type { Request, Response } from "express";
import { DbService } from "../services";

export const getAll = async (req: Request, res: Response) => {
  const list = await DbService.getAllWatchLater();
  res.json(list);
};

export const Add = async (req: Request, res: Response) => {
  const watchLater = req.body;

  try {
    await DbService.addWatchLater(watchLater);
    res.json(watchLater);
  } catch (error) {
    console.error("Error adding watch later:", error);
    res.status(500).json({ error: "Failed to add watch later" });
  }
};

export const Delete = async (req: Request, res: Response) => {
    const { pageUrl } = req.body;

    try {
      await DbService.deleteWatchLater(pageUrl);
      res.json({ success: true });
    } catch (error) {
        console.error("Error deleting watch later:", error);
        res.status(500).json({ error: "Failed to delete watch later" });
    }
};
