import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from './browser.js';
import { parseMp4Streams } from "./streamParser.js";
import fs from "fs";
import fetch from "node-fetch";

let port = process.env.PORT || 3000;

const optionsPath = "/data/options.json";
if (fs.existsSync(optionsPath)) {
    try {
        const options = JSON.parse(fs.readFileSync(optionsPath, "utf-8"));
        if (options.port) {
            port = options.port;
        }
        if (options.browser_pool_size) {
            process.env.BROWSER_POOL_SIZE = options.browser_pool_size;
        }
        if (options.browser_nav_timeout) {
            process.env.BROWSER_NAV_TIMEOUT = options.browser_nav_timeout;
        }
        if (options.download_path) {
            process.env.DOWNLOAD_PATH = options.download_path;
        }
    } catch (e) {
        console.error("Failed to read options.json", e);
    }
}

const downloadPath = process.env.DOWNLOAD_PATH || (process.platform === 'win32' ? "./media/downloads" : "/media/downloads");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.send("OK"));

app.post("/api/search", async (req, res) => {
    const { url } = req.body;

    try {
        var results = await parse(url, () => {
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
        }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-content__htitle', selectorTimeout: 15000, evalArg: {} });

        res.send(results);

    } catch (e) {
        console.info(`Search failed for query: ${query}`);
        console.error(e);

        res.status(500).send("Search failed");
    }
});

app.post("/api/parse", async (req, res) => {
    const { url, data_translator_id } = req.body;

    try {
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
                        if (res.length > 0)
                            break;
                    }
                    await new Promise(r => setTimeout(r, 250));
                }

                return res;
            }


            let streams = await getSreams();

            let videoElement = () => { return document.querySelector('#player').querySelector("video") }

            let temp_video_src = videoElement().src

            let translationChangeAttempt = false;
            let translationChanged = false;
            let translationFound = false;

            if (evalArg.data_translator_id != null && evalArg.data_translator_id != undefined) {
                const translation = document.querySelector(`[data-translator_id="${evalArg.data_translator_id}"]`);

                if (translation) {
                    translationFound = true;

                    triggerAll(translation);

                    translationChangeAttempt = true;

                    for (let i = 0; i < 40; i++) {
                        const t = document.querySelector(`[data-translator_id="${evalArg.data_translator_id}"]`);
                        if (t && t.classList.contains('active')) {
                            translationChanged = true;
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
                title,
                titleOriginal,
                posterUrl,
                streams,
                translations,
                seasons,
                episodes,

                debug: {
                    temp_video_src,
                    current_video_src,
                    translationChangeAttempt,
                    translationChanged,
                    translationFound
                }
            };
        }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-post__title', selectorTimeout: 15000, evalArg: { data_translator_id: data_translator_id, parseStreamsFuncString: parseMp4Streams.toString() } }).then(data => {

            res.send({
                title: data.title,
                titleOriginal: data.titleOriginal,
                posterUrl: data.posterUrl,
                streams: data.streams.map(originalStream => {
                    return {
                        quality: originalStream.quality,
                        mp4FileName: `${data.titleOriginal || data.title} [${originalStream.quality}].mp4`,
                        mp4: originalStream.mp4,
                        mp4Android: `intent:${originalStream.mp4}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`,
                    }
                }),
                translations: data.translations,
                seasons: data.seasons,
                episodes: data.episodes,
                debug: data.debug
            });
        });
    } catch (e) {
        console.info(`Parse failed for URL: ${url}`);
        console.error(e);

        res.status(500).send("parse failed");
    }
});

const downloads = {};

app.get("/api/downloads", (req, res) => {
    res.json(Object.values(downloads).sort((a, b) => b.startTime - a.startTime));
});

app.post("/api/download", async (req, res) => {
    const { url, filename } = req.body;
    if (!url || !filename) return res.status(400).send("Missing url or filename");

    const id = Date.now().toString();
    downloads[id] = {
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

    // Start download in background
    (async () => {
        const task = downloads[id];
        try {
            if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });
            const dest = path.join(downloadPath, filename);
            
            task.status = 'downloading';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const total = parseInt(response.headers.get('content-length') || '0', 10);
            task.total = total;

            const fileStream = fs.createWriteStream(dest);
            let lastLoaded = 0;
            let lastTime = Date.now();

            response.body.on('data', (chunk) => {
                task.loaded += chunk.length;
                if (task.total) task.progress = Math.round((task.loaded / task.total) * 100);
                
                const now = Date.now();
                if (now - lastTime >= 1000) {
                    task.speed = (task.loaded - lastLoaded) / ((now - lastTime) / 1000);
                    lastLoaded = task.loaded;
                    lastTime = now;
                }
            });

            response.body.on('error', (err) => {
                task.status = 'error';
                task.error = err.message;
                task.speed = 0;
            });

            fileStream.on('finish', () => {
                task.status = 'completed';
                task.progress = 100;
                task.speed = 0;
            });

            response.body.pipe(fileStream);
            task.controller = { abort: () => response.body.destroy() }; // Mock controller for cancel

        } catch (e) {
            task.status = 'error';
            task.error = e.message;
        }
    })();

    res.json({ status: 'started', id });
});

app.post("/api/downloads/:id/cancel", (req, res) => {
    const { id } = req.params;
    if (downloads[id]) {
        if (downloads[id].controller) downloads[id].controller.abort();
        delete downloads[id];
    }
    res.send("ok");
});

app.use("/", express.static(path.join(__dirname, "../frontend")));

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
