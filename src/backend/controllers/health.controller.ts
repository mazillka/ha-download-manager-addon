import type { Request, Response } from "express";
import { asyncHandler } from "../utils";

export const HealthCheck = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(200).send("OK");
  },
);
