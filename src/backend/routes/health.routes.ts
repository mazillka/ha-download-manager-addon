import { Router } from "express";
import { HealthCheck } from "../controllers/health.controller";

const router = Router();

router.get("/", HealthCheck);

export default router;
