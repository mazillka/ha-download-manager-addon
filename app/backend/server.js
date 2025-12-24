import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from './browser.js';
import { parseMp4Streams } from "./streamParser.js";
import fs from "fs";
import fetch from "node-fetch";
import * as dbService from "./db.js";

const port = process.env.PORT || 3000;
const downloadPath = process.env.DOWNLOAD_PATH || (process.platform === 'win32' ? "./media/downloads" : "/media/DOWNLOADS");
const baseUrl = process.env.BASE_URL || "https://hdrezka.me";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

dbService.initDB();

app.get("/health", (req, res) => res.send("OK"));

app.get("/api/config", (req, res) => res.json({ baseUrl }));

app.post("/api/search", async (req, res) => {
    const { url } = req.body;

    await parse(url, () => {
        return [...document.querySelectorAll('.b-content__inline_item')].map(item => {
            const titleElement = item.querySelector('.b-content__inline_item-link');
            const title = titleElement ? titleElement.textContent.trim() : 'No title';

            const element = item.querySelector('.b-content__inline_item-cover');
            const pageUrl = element.querySelector('a') ? element.querySelector('a').href : '#';
            const posterUrl = element.querySelector('img') ? element.querySelector('img').src : '';

            const category = element.querySelector(".cat") ? element.querySelector(".cat").textContent.trim() : '';

            return {
                title,
                pageUrl,
                posterUrl,
                category
            };
        });
    }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-content__htitle', selectorTimeout: 15000, evalArg: {} })
        .then(data => {
            res.send(data);
        }).catch(error => {
            console.info(`Search failed for URL: ${url}`);
            console.error('Error:', error);

            res.status(500).send("Search failed");
        });
});

app.post("/api/parse", async (req, res) => {
    const { url, data_translator_id } = req.body;

    await parse(url, async (evalArg) => {
        function triggerAll(el) {
            if (!el) {
                return;
            }

            el.focus();

            const events = [
                'pointerdown', 'mousedown',
                'pointerup', 'mouseup',
                'click'
            ];

            events.forEach(type => {
                el.dispatchEvent(new Event(type, {
                    bubbles: true,
                    cancelable: true
                }));
            });
        }

        const parseStreamsFunc = new Function("return " + evalArg.parseStreamsFuncString)();

        let getSreams = async () => {
            let res = [];

            for (let i = 0; i < 20; i++) {
                if (typeof CDNPlayerInfo !== 'undefined' && CDNPlayerInfo.streams) {
                    res = parseStreamsFunc(CDNPlayerInfo.streams);
                    if (res.length > 0) {
                        break;
                    }
                }
                await new Promise(r => setTimeout(r, 250));
            }

            return res;
        }


        let streams = await getSreams();

        let videoElement = () => { return document.querySelector('#player').querySelector("video") }

        let temp_video_src = videoElement().src

        if (evalArg.data_translator_id != null && evalArg.data_translator_id != undefined) {
            const translation = document.querySelector(`[data-translator_id="${evalArg.data_translator_id}"]`);

            if (translation) {
                triggerAll(translation);

                for (let i = 0; i < 40; i++) {
                    const t = document.querySelector(`[data-translator_id="${evalArg.data_translator_id}"]`);
                    if (t && t.classList.contains('active')) {
                        break;
                    }
                    await new Promise(r => setTimeout(r, 250));
                }
            }
        }

        let current_video_src = videoElement().src

        if (temp_video_src != current_video_src) {
            streams = await getSreams();
        }

        const title = document.querySelector('.b-post__title')?.textContent.trim();
        const titleOriginal = document.querySelector('.b-post__origtitle')?.textContent.trim();
        const posterUrl = document.querySelector('.b-sidecover img')?.src;
        const year = Number(document.querySelector('.b-post__info a[href*="/year/"]')?.textContent.match(/\d{4}/)?.[0]);

        const translations = [...document.querySelectorAll('.b-translator__item')].map(el => {
            return {
                name: el.textContent.trim(),
                active: el.classList.contains('active'),
                data_translator_id: el.getAttribute('data-translator_id'),
                url: el.href
            }
        });


        var seasons = [];

        var episodes = [];

        const seasonsElement = document.querySelector("#simple-seasons-tabs")
        if (seasonsElement) {
            seasons = [...seasonsElement.querySelectorAll(".b-simple_season__item")].map(el => {
                return {
                    name: el.textContent.trim(),
                    active: el.classList.contains('active'),
                    url: el.href,
                    data_tab_id: el.getAttribute('data-tab_id'),
                };
            });

            const episodesElement = document.querySelector(".b-simple_episode__item.active").parentElement;
            if (episodesElement) {
                episodes = [...episodesElement.querySelectorAll(".b-simple_episode__item")].map(el => {
                    return {
                        name: el.textContent.trim(),
                        active: el.classList.contains('active'),
                        url: el.href,
                        data_id: el.getAttribute('data-id'),
                        data_season_id: el.getAttribute('data-season_id'),
                        data_episode_id: el.getAttribute('data-episode_id')
                    };
                });
            }
        }

        return {
            year,
            title,
            titleOriginal,
            posterUrl,
            streams,
            translations,
            seasons,
            episodes,

            debug: {
                temp_video_src,
                current_video_src
            }
        };
    }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-post__title', selectorTimeout: 15000, evalArg: { data_translator_id: data_translator_id, parseStreamsFuncString: parseMp4Streams.toString() } })
        .then(data => {
            const isShow = data.seasons.length > 0;

            const activeEpisode = data.episodes.find(x => x.active);
            const seasonAndEipisode = activeEpisode ? `S${activeEpisode.data_season_id}E${activeEpisode.data_episode_id} ` : "";

            let year = "";
            if (!isShow) {
                year = ` (${data.year}) `;
            }

            res.send({
                isShow: isShow,
                year: data.year,
                title: data.title,
                titleOriginal: data.titleOriginal,
                posterUrl: data.posterUrl,
                streams: data.streams.map(originalStream => {
                    return {
                        quality: originalStream.quality,
                        mp4FileName: `${data.titleOriginal || data.title} ${year}${seasonAndEipisode}[${originalStream.quality}].mp4`,
                        mp4: originalStream.mp4,
                        mp4Android: `intent:${originalStream.mp4}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`,
                    }
                }),
                translations: data.translations,
                seasons: data.seasons,
                episodes: data.episodes,
                debug: data.debug
            });
        }).catch(error => {
            console.info(`Parse failed for URL: ${url}`);
            console.error('Error:', error);

            res.status(500).send("Parse failed");
        });
});

const activeControllers = {};

const startDownload = async (id) => {
    const task = await dbService.getTask(id);
    if (!task)
        return;

    try {
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }
        const dest = path.join(downloadPath, task.filename);

        task.status = 'downloading';
        task.error = null;
        activeControllers[id] = new AbortController();
        await dbService.saveTask(task);

        let headers = {};
        let flags = 'w';

        if (task.loaded > 0 && fs.existsSync(dest)) {
            const stat = fs.statSync(dest);
            if (stat.size !== task.loaded) {
                task.loaded = stat.size;
            }
            headers['Range'] = `bytes=${task.loaded}-`;
            flags = 'a';
        } else {
            task.loaded = 0;
        }

        const response = await fetch(task.url, { headers, signal: activeControllers[id].signal });
        if (!response.ok) {
            if (response.status === 416) { // Range Not Satisfiable (likely completed)
                task.status = 'completed';
                task.progress = 100;
                await dbService.saveTask(task);
                delete activeControllers[id];
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        if (flags === 'a' && response.status !== 206) {
            flags = 'w'; // Server didn't accept range, restart
            task.loaded = 0;
        }

        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        if (response.status === 206) {
            const contentRange = response.headers.get('content-range');
            if (contentRange) {
                const match = contentRange.match(/\/(\d+)$/);
                if (match) task.total = parseInt(match[1], 10);
            } else {
                task.total = task.loaded + contentLength;
            }
        } else {
            task.total = contentLength;
        }
        await dbService.saveTask(task); // Save total size

        const fileStream = fs.createWriteStream(dest, { flags });
        let lastLoaded = task.loaded;
        let lastTime = Date.now();

        response.body.on('data', (chunk) => {
            task.loaded += chunk.length;
            if (task.total) task.progress = Math.round((task.loaded / task.total) * 100);

            const now = Date.now();
            if (now - lastTime >= 1000) {
                task.speed = (task.loaded - lastLoaded) / ((now - lastTime) / 1000);
                lastLoaded = task.loaded;
                lastTime = now;
                dbService.saveTask(task).catch(console.error);
            }
        });

        response.body.on('error', (error) => {
            if (error.name === 'AbortError') return;
            task.status = 'error';
            task.error = error.message;
            task.speed = 0;
            delete activeControllers[id];
            dbService.saveTask(task).catch(console.error);
        });

        fileStream.on('finish', () => {
            if (task.status === 'downloading') {
                task.status = 'completed';
                task.progress = 100;
                task.speed = 0;
                delete activeControllers[id];
                dbService.saveTask(task).catch(console.error);

                // Log to Database
                dbService.addHistory(task.filename, task.total)
                    .then(() => console.info(`Saved ${task.filename} to history DB.`))
                    .catch(error => console.error("Failed to save download to DB:", error));
            }
        });

        response.body.pipe(fileStream);
    } catch (error) {
        if (error.name === 'AbortError') {
            if (task.status !== 'paused') {
                task.status = 'error';
                task.error = 'Aborted';
            }
        } else {
            task.status = 'error';
            task.error = error.message;
        }
        task.speed = 0;
        delete activeControllers[id];
        await dbService.saveTask(task);
    }
};

app.get("/api/downloads", async (req, res) => {
    try {
        const tasks = await dbService.getAllTasks();
        res.json(tasks.sort((a, b) => b.startTime - a.startTime));
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get("/api/history", async (req, res) => {
    try {
        await dbService.getHistory()
            .then(rows => {
                res.json(rows);
            });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/download", async (req, res) => {
    const { url, filename } = req.body;
    if (!url || !filename) {
        return res.status(400).send("Missing url or filename");
    }

    const id = Date.now().toString();
    const task = {
        id,
        filename,
        url,
        status: 'pending',
        progress: 0,
        loaded: 0,
        total: 0,
        speed: 0,
        startTime: Date.now(),
        error: null
    };

    await dbService.saveTask(task);
    startDownload(id);

    res.json({ status: 'started', id });
});

app.post("/api/downloads/:id/pause", async (req, res) => {
    const { id } = req.params;
    const task = await dbService.getTask(id);
    if (task && task.status === 'downloading') {
        task.status = 'paused';
        if (activeControllers[id]) {
            activeControllers[id].abort();
            delete activeControllers[id];
        }
        await dbService.saveTask(task);
    }
    res.send("ok");
});

app.post("/api/downloads/:id/resume", async (req, res) => {
    const { id } = req.params;
    const task = await dbService.getTask(id);
    if (task && (task.status === 'paused' || task.status === 'error')) {
        startDownload(id);
    }
    res.send("ok");
});

app.delete("/api/downloads/:id", async (req, res) => {
    const { id } = req.params;
    const { removeFile } = req.query;
    const task = await dbService.getTask(id);
    if (task) {
        if (activeControllers[id]) {
            activeControllers[id].abort();
            delete activeControllers[id];
        }
        if (removeFile === 'true') {
            const dest = path.join(downloadPath, task.filename);
            if (fs.existsSync(dest)) {
                try {
                    fs.unlinkSync(dest);
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        }
        await dbService.deleteTask(id);
    }
    res.send("ok");
});

app.post("/api/downloads/:id/cancel", async (req, res) => {
    const { id } = req.params;
    const task = await dbService.getTask(id);
    if (task) {
        if (activeControllers[id]) {
            activeControllers[id].abort();
            delete activeControllers[id];
        }
        await dbService.deleteTask(id);
    }
    res.send("ok");
});

app.use("/", express.static(path.join(__dirname, "../frontend")));

// Load tasks from DB before starting
dbService.getAllTasks().then(tasks => {
    Promise.all(tasks.map(async (t) => {
        // If it was downloading when killed, set to paused
        if (t.status === 'downloading') {
            t.status = 'paused';
            t.error = 'Interrupted by server restart';
            await dbService.saveTask(t);
        }
    })).then(() => {
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
});
