import type { Request, Response } from "express";
import { DownloadService } from "../services";

export const GetAll = async (req: Request, res: Response) => {
  const list = await DownloadService.GetAll();
  res.json({ list: list.sort((a, b) => b.startTime - a.startTime) });
};

export const Create = async (req: Request, res: Response) => {
  const { url, filename } = req.body;

  if (!url || !filename) {
    res.status(400).send("Missing url or filename");
    return;
  }

  const id = await DownloadService.Create(url, filename);
  res.json({ status: "started", id });
};

export const Pause = async (req: Request, res: Response) => {
  await DownloadService.Pause(req.params.id as string);
  res.status(200).send("OK");
};

export const Resume = async (req: Request, res: Response) => {
  await DownloadService.Resume(req.params.id as string);
  res.status(200).send("OK");
};

export const Cancel = async (req: Request, res: Response) => {
  await DownloadService.Cancel(req.params.id as string);
  res.status(200).send("OK");
};

export const Delete = async (req: Request, res: Response) => {
  const removeFile = req.query.removeFile === "true";
  await DownloadService.Delete(req.params.id as string, removeFile);
  res.status(200).send("OK");
};
