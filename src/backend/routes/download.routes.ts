import { Router } from "express";
import {
  GetAll,
  Create,
  Pause,
  Resume,
  Cancel,
  Delete,
} from "../controllers/download.controller";

const router = Router();

router.get("/get-all", GetAll);
router.post("/add", Create);
router.post("/:id/pause", Pause);
router.post("/:id/resume", Resume);
router.post("/:id/cancel", Cancel);
router.delete("/:id/delete", Delete);

export default router;
