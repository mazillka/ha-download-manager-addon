import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from './browser.js';
import { parseMp4Streams } from "./streamParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

app.post("/api/search", async (req, res) => {
    const { query } = req.body;
    const searchUrl = `https://hdrezka.me/search/?do=search&subaction=search&q=${encodeURIComponent(query)}`;

    try {
        var results = await parse(searchUrl, () => {
            return [...document.querySelectorAll('.b-content__inline_item')].map(item => {
                const titleElement = item.querySelector('.b-content__inline_item-link');
                const title = titleElement ? titleElement.textContent.trim() : 'No title';

                const element = item.querySelector('.b-content__inline_item-cover');
                var pageUrl = element.querySelector('a') ? element.querySelector('a').href : '#';
                var posterUrl = element.querySelector('img') ? element.querySelector('img').src : '';

                return {
                    title,
                    pageUrl,
                    posterUrl
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

            const title = document.querySelector('.b-post__title').textContent.trim();
            const titleOriginal = document.querySelector('.b-post__origtitle').textContent.trim();
            const posterUrl = document.querySelector('.b-sidecover img').src;

            const translations = [...document.querySelectorAll('.b-translator__item')].map(el => {
                return {
                    name: el.textContent.trim(),
                    active: el.classList.contains('active'),
                    data_translator_id: el.getAttribute('data-translator_id')
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
                title: title,
                titleOriginal: titleOriginal,
                posterUrl: posterUrl,
                streams: streams,
                translations: translations,
                seasons: seasons,
                episodes: episodes,

                debug: {
                    temp_video_src: temp_video_src,
                    current_video_src: current_video_src,
                    translationChangeAttempt: translationChangeAttempt,
                    translationChanged: translationChanged,
                    translationFound: translationFound
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

app.use("/", express.static(path.join(__dirname, "../frontend")));

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
