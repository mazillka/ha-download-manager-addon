import { Router } from "express";
import { GetAll, Add, Delete } from "../controllers/watchLater.controller";

const router = Router();

router.get("/", GetAll);
router.post("/", Add);
router.delete("/", Delete);

export default router;
