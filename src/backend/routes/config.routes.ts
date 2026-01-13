import { Router } from "express";
import {
  GetAll,
  AddOrUpdateAll
} from "../controllers/config.controller";

const router = Router();

router.get("/", GetAll);
router.post("/", AddOrUpdateAll);

export default router;
