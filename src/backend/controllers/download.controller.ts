import type { Request, Response } from "express";
import { DownloadService, DbService } from "../services";

export const getDownloads = async (req: Request, res: Response) => {
  const tasks = await DbService.getAllTasks();
  res.json(tasks.sort((a, b) => b.startTime - a.startTime));
};

export const createDownload = async (req: Request, res: Response) => {
  const { url, filename } = req.body;

  if (!url || !filename) {
    res.status(400).send("Missing url or filename");
    return;
  }

  const id = await DownloadService.createDownload(url, filename);
  res.json({ status: "started", id });
};

export const pauseDownload = async (req: Request, res: Response) => {
  await DownloadService.pauseDownload(req.params.id);
  res.status(200).send("OK");
};

export const resumeDownload = async (req: Request, res: Response) => {
  await DownloadService.resumeDownload(req.params.id);
  res.status(200).send("OK");
};

export const cancelDownload = async (req: Request, res: Response) => {
  await DownloadService.cancelDownload(req.params.id);
  res.status(200).send("OK");
};

export const deleteDownload = async (req: Request, res: Response) => {
  const removeFile = req.query.removeFile === "true";
  await DownloadService.deleteDownload(req.params.id, removeFile);
  res.status(200).send("OK");
};
