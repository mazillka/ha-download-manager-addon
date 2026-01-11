import { Router } from "express";
import {
  getAll,
  addOrUpdate
} from "../controllers/config.controller";

const router = Router();

router.get("/", getAll);
router.post("/", addOrUpdate);

export default router;
