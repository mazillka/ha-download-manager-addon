import { Router } from "express";
import { GetAll, AddOrUpdateAll } from "../controllers/config.controller";

const router = Router();

router.get("/get-all", GetAll);
router.post("/add-or-update-all", AddOrUpdateAll);

export default router;
