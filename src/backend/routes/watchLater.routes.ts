import { Router } from "express";
import { GetAll, Add, Delete } from "../controllers/watchLater.controller";

const router = Router();

router.get("/get-all", GetAll);
router.post("/add", Add);
router.delete("/delete", Delete);

export default router;
