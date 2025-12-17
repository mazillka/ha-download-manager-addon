import express from "express";
import path from "path";
import { fileURLToPath } from "url";
// import { createDownload, getTask, pause, resume, cancel, setOptions } from "./downloadManager.js";
import { parse } from './browser.js';

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
                var url = element.querySelector('a') ? element.querySelector('a').href : '#';
                var imgSrc = element.querySelector('img') ? element.querySelector('img').src : '';

                return { title, url, imgSrc };
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
        var results = await parse(url, (evalArg) => {
            function clearTrash(data) {
                function product(iterables, repeat) {
                    var argv = Array.prototype.slice.call(arguments), argc = argv.length;
                    if (argc === 2 && !isNaN(argv[argc - 1])) {
                        var copies = [];
                        for (var i = 0; i < argv[argc - 1]; i++) {
                            copies.push(argv[0].slice()); // Clone
                        }
                        argv = copies;
                    }
                    return argv.reduce(function tl(accumulator, value) {
                        var tmp = [];
                        accumulator.forEach(function (a0) {
                            value.forEach(function (a1) {
                                tmp.push(a0.concat(a1));
                            });
                        });
                        return tmp;
                    }, [[]]);
                }
                function unite(arr) {
                    var final = [];
                    arr.forEach(function (e) {
                        final.push(e.join(""))
                    })
                    return final;
                }
                var trashList = ["@", "#", "!", "^", "$"];
                var two = unite(product(trashList, 2));
                var tree = unite(product(trashList, 3));
                var trashCodesSet = two.concat(tree);

                var arr = data.replace("#h", "").split("//_//");
                var trashString = arr.join('');

                trashCodesSet.forEach(function (i) {
                    var temp = btoa(i)
                    trashString = trashString.replaceAll(temp, '')
                })
                try {
                    var final_string = atob(trashString);
                } catch {
                    console.error(trashString)
                }
                return final_string;
            }

            if(evalArg.data_translator_id != null && evalArg.data_translator_id != undefined){
                const translation = document.querySelector(`[data-translator_id="${evalArg.data_translator_id}"]`);

                translation.click();

                setTimeout(() => {}, 2000);
            }

            const streams = clearTrash(CDNPlayerInfo.streams).split(",");
            const title = document.querySelector('.b-post__title').textContent.trim();
            const titleOriginal = document.querySelector('.b-post__origtitle').textContent.trim();
            const imgSrc = document.querySelector('.b-sidecover img').src;

            const translations = [...document.querySelectorAll('.b-translator__item')].map(el => {
                return {
                    name: el.textContent.trim(),
                    active: el.classList.contains('active'),
                    data_translator_id: el.getAttribute('data-translator_id')
                }
            });

            return {
                title: title,
                titleOriginal: titleOriginal,
                imgSrc: imgSrc,
                streams: streams,
                translations: translations,
            };
        }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-post__title', selectorTimeout: 15000, evalArg: { data_translator_id: data_translator_id } });

        res.send(results);
    } catch (e) {
        console.info(`Parse failed for URL: ${url}`);
        console.error(e);

        res.status(500).send("parse failed");
    }
});

// app.post("/api/parse_old", async (req, res) => {
//     const { url } = req.body;

//     try {
//         var results = await parse(url, () => {
//             const title = document.querySelector('.b-post__title').textContent.trim();
//             const titleOriginal = document.querySelector('.b-post__origtitle').textContent.trim();
//             const imgSrc = document.querySelector('.b-sidecover img').src;

//             return { title, titleOriginal, imgSrc };
//         }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-post__title', selectorTimeout: 15000 });

//         res.send(results);
//     } catch (e) {
//         console.info(`Parse failed for URL: ${url}`);
//         console.error(e);

//         res.status(500).send("parse failed");
//     }
// });

// app.post("/api/downloads", (req, res) => {
//     return res.json({ id: createDownload(req.body) });
// });
// app.get("/api/downloads/:id", (req, res) => {
//     return res.json(getTask(req.params.id));
// });
// app.post("/api/downloads/:id/pause", (req, res) => {
//     pause(req.params.id); res.json({ ok: true })
// });
// app.post("/api/downloads/:id/resume", (req, res) => {
//     resume(req.params.id); res.json({ ok: true })
// });
// app.delete("/api/downloads/:id", (req, res) => {
//     cancel(req.params.id); res.json({ ok: true })
// });
// app.post("/api/options", (req, res) => {
//     setOptions(req.body); res.json({ ok: true })
// });

app.use("/", express.static(path.join(__dirname, "../frontend")));
app.listen(3000);
