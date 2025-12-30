import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { DbService, DownloadService, ParseService } from "./services/index";

const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || "https://hdrezka.me";

// https://hdrezka.ag
// https://hdrezka.me
// https://hdrezka.name
// https://hdrezka-home.tv

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const frontendPath = path.resolve(__dirname, "../frontend");

const app = express();
app.use(express.json());

DbService.initDB();

app.get("/health", (req: Request, res: Response) => { res.send("OK"); });

app.get("/api/config", (req: Request, res: Response) => { res.json({ baseUrl }); });

app.post("/api/search", async (req: Request, res: Response) => {
    const { url } = req.body;

    try {
        const data = await ParseService.search(url);
        res.send(data);
    } catch (error) {
        console.info(`Search failed for URL: ${url}`);
        console.error('Error:', error);
        res.status(500).send("Search failed");
    }
});

app.post("/api/parse", async (req: Request, res: Response) => {
    const { url, data_translator_id } = req.body;

    try {
        const data = await ParseService.parse(url, data_translator_id);
        res.send(data);
    } catch (error) {
        console.info(`Parse failed for URL: ${url}`);
        console.error('Error:', error);
        res.status(500).send("Parse failed");
    }
});

app.get("/api/downloads", async (req: Request, res: Response) => {
    try {
        const tasks = await DbService.getAllTasks();
        res.json(tasks.sort((a, b) => b.startTime - a.startTime));
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

app.get("/api/history", async (req: Request, res: Response) => {
    try {
        const rows = await DbService.getHistory();
        res.json(rows);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/download", async (req: Request, res: Response) => {
    const { url, filename } = req.body;
    if (!url || !filename) {
        res.status(400).send("Missing url or filename");
        return;
    }

    const id = await DownloadService.createDownload(url, filename);
    res.json({ status: 'started', id });
});

app.post("/api/downloads/:id/pause", async (req: Request, res: Response) => {
    const { id } = req.params;
    
    await DownloadService.pauseDownload(id);
    res.send("ok");
});

app.post("/api/downloads/:id/resume", async (req: Request, res: Response) => {
    const { id } = req.params;

    await DownloadService.resumeDownload(id);
    res.send("ok");
});

app.delete("/api/downloads/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { removeFile } = req.query;

    await DownloadService.deleteDownload(id, removeFile === 'true');
    res.send("ok");
});

app.post("/api/downloads/:id/cancel", async (req: Request, res: Response) => {
    const { id } = req.params;

    await DownloadService.cancelDownload(id);
    res.send("ok");
});

app.use(express.static(frontendPath));

app.use((req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Load tasks from DB before starting
DownloadService.restoreDownloads().then(tasks => {
    console.info(`Loaded ${tasks.length} tasks from DB.`);

    app.listen(port, () => {
        console.info("Starting server...");

        console.info(`BASE_URL: ${process.env.BASE_URL}`);
        console.info(`DOWNLOAD_PATH: ${process.env.DOWNLOAD_PATH}`);
        console.info(`PORT: ${process.env.PORT}`);
        console.info(`BROWSER_POOL_SIZE: ${process.env.BROWSER_POOL_SIZE}`);
        console.info(`BROWSER_NAV_TIMEOUT: ${process.env.BROWSER_NAV_TIMEOUT}`);

        console.info(`Server running on http://localhost:${port}`);
    });
});