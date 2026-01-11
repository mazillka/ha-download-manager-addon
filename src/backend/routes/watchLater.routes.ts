import { Router } from "express";
import { getAll, Add, Delete } from "../controllers/watchLater.controller";

const router = Router();

router.get("/", getAll);
router.post("/", Add);
router.delete("/", Delete);

export default router;
