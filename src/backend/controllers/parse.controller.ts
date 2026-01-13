import type { Request, Response } from "express";
import { ParseService } from "../services";

export const search = async (req: Request, res: Response) => {
  const { url } = req.body;

  try {
    const list = await ParseService.search(url);
    res.json({ list });
  } catch (error) {
    console.info(`Search failed for URL: ${url}`);
    res.status(500).send("Search failed");
  }
};

export const parse = async (req: Request, res: Response) => {
  const { url, data_translator_id } = req.body;

  try {
    const details = await ParseService.parse(url, data_translator_id);
    res.json({ details });
  } catch (error) {
    console.info(`Parse failed for URL: ${url}`);
    res.status(500).send("Parse failed");
  }
};
