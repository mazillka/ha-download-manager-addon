import type { Request, Response, NextFunction } from "express";
import { DownloadService } from "../services";
import { asyncHandler } from "../utils";

export const GetAll = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const list = await DownloadService.GetAll(page, limit);
    res.json({ list: list.sort((a, b) => b.startTime - a.startTime) });
  },
);

export const Create = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { url, filename } = req.body;

    if (!url || !filename) {
      res.status(400).send({ message: "Missing url or filename" });
      return;
    }

    const id = await DownloadService.Create(url, filename);
    res.json({ status: "started", id });
  },
);

export const Pause = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await DownloadService.Pause(req.params.id as string);
    res.json({ success: true });
  },
);

export const Resume = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await DownloadService.Resume(req.params.id as string);
    res.json({ success: true });
  },
);

export const Cancel = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await DownloadService.Cancel(req.params.id as string);
    res.json({ success: true });
  },
);

export const Delete = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const removeFile = req.query.removeFile === "true";

    await DownloadService.Delete(req.params.id as string, removeFile);
    res.json({ success: true });
  },
);
