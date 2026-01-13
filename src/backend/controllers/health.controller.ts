import type { Request, Response } from "express";

export const HealthCheck = (req: Request, res: Response) => {
  res.status(200).send("OK");
};
