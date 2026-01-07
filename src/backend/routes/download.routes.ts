import { Router } from "express";
import {
  getDownloads,
  createDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  deleteDownload
} from "../controllers/download.controller";

const router = Router();

router.get("/", getDownloads);
router.post("/", createDownload);
router.post("/:id/pause", pauseDownload);
router.post("/:id/resume", resumeDownload);
router.post("/:id/cancel", cancelDownload);
router.delete("/:id", deleteDownload);

export default router;
