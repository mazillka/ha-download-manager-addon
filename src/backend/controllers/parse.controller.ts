import type { Request, Response } from "express";
import { ParseService } from "../services";

export const search = async (req: Request, res: Response) => {
  const { url } = req.body;

  try {
    const data = await ParseService.search(url);
    res.send(data);
  } catch (error) {
    console.info(`Search failed for URL: ${url}`);
    res.status(500).send("Search failed");
  }
};

export const parse = async (req: Request, res: Response) => {
  const { url, data_id, data_translator_id } = req.body;

  try {
    const data = await ParseService.parse(url, data_id, data_translator_id);
    res.send(data);
  } catch (error) {
    console.info(`Parse failed for URL: ${url}`);
    res.status(500).send("Parse failed");
  }
};
