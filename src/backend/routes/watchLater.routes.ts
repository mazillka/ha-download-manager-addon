import { Router } from "express";
import { GetAll, Add, Delete, Sync } from "../controllers/watchLater.controller";

const router = Router();

router.get("/", GetAll);
router.post("/", Add);
router.delete("/", Delete);
router.post("/sync", Sync);

export default router;
