import { Router } from "express";
import {
  GetAll,
  Create,
  Pause,
  Resume,
  Cancel,
  Delete
} from "../controllers/download.controller";

const router = Router();

router.get("/", GetAll);
router.post("/", Create);
router.post("/:id/pause", Pause);
router.post("/:id/resume", Resume);
router.post("/:id/cancel", Cancel);
router.delete("/:id", Delete);

export default router;
