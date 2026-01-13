import { Router } from "express";
import { Search, GetDetails } from "../controllers/parse.controller";

const router = Router();

router.post("/search", Search);
router.post("/getDetails", GetDetails);

export default router;
