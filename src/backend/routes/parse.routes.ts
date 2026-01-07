import { Router } from "express";
import { search, parse } from "../controllers/parse.controller";

const router = Router();

router.post("/search", search);
router.post("/parse", parse);

export default router;
