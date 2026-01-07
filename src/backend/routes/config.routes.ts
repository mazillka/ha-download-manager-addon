import { Router } from "express";
import {
  getConfigs,
  saveConfigs
} from "../controllers/config.controller";

const router = Router();

router.get("/", getConfigs);
router.post("/", saveConfigs);

export default router;
