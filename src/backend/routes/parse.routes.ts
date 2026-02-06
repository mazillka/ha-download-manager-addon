import { Router } from "express";
import {
  Search,
  GetDetails,
  GetStreams,
} from "../controllers/parse.controller";

const router = Router();

router.post("/search", Search);
router.post("/get-details", GetDetails);
router.post("/get-streams", GetStreams);

export default router;
