import { Router } from "express";
import { GetAll, Add, Delete, Sync } from "../controllers/watchLater.controller";

const router = Router();

router.get("/get-all", GetAll);
router.post("/add", Add);
router.delete("/delete", Delete);
router.post("/sync", Sync);

export default router;
