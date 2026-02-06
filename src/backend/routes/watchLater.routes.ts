import { Router } from "express";
import {
  GetAll,
  Add,
  Delete,
  GetUrls,
} from "../controllers/watchLater.controller";

const router = Router();

router.get("/get-urls", GetUrls);
router.get("/get-all", GetAll); // This is the paginated one
router.post("/add", Add);
router.delete("/delete", Delete);

export default router;
