import * as browserService from './browserService.js';
import { parseMp4Streams } from "../streamParser.js";

export interface SearchResult {
    title: string;
    pageUrl: string;
    posterUrl: string;
    category: string;
}

export interface Stream {
    quality: string;
    mp4FileName: string;
    mp4: string;
    mp4Android: string;
}

export interface Translation {
    name: string;
    active: boolean;
    data_translator_id: string | null;
    url: string;
}

export interface Season {
    name: string;
    active: boolean;
    url: string;
    data_tab_id: string | null;
}

export interface Episode {
    name: string;
    active: boolean;
    url: string;
    data_id: string | null;
    data_season_id: string | null;
    data_episode_id: string | null;
}

export interface ParseResult {
    isShow: boolean;
    year: number | string;
    title: string;
    titleOriginal: string;
    posterUrl: string;
    streams: Stream[];
    translations: Translation[];
    seasons: Season[];
    episodes: Episode[];
    debug: any;
}

export const search = async (url: string): Promise<SearchResult[]> => {
    return await browserService.parse(url, () => {
        return [...document.querySelectorAll('.b-content__inline_item')].map(item => {
            const titleElement = item.querySelector('.b-content__inline_item-link');
            const title = titleElement ? titleElement.textContent?.trim() || 'No title' : 'No title';

            const element = item.querySelector('.b-content__inline_item-cover');
            const pageUrl = element?.querySelector('a') ? (element.querySelector('a') as HTMLAnchorElement).href : '#';
            const posterUrl = element?.querySelector('img') ? (element.querySelector('img') as HTMLImageElement).src : '';

            const category = element?.querySelector(".cat") ? element.querySelector(".cat")?.textContent?.trim() || '' : '';

            return {
                title,
                pageUrl,
                posterUrl,
                category
            };
        });
    }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-content__htitle', selectorTimeout: 15000, evalArg: {} });
};

export const parse = async (url: string, data_translator_id?: string): Promise<ParseResult> => {
    const data = await browserService.parse(url, async (evalArg: any) => {
        function triggerAll(el: Element | null) {
            if (!el) {
                return;
            }

            // @ts-ignore
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
            let res: any[] = [];

            for (let i = 0; i < 20; i++) {
                // @ts-ignore
                if (typeof CDNPlayerInfo !== 'undefined' && CDNPlayerInfo.streams) {
                    // @ts-ignore
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

        let videoElement = () => { return document.querySelector('#player')!.querySelector("video")! }

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

        const title = document.querySelector('.b-post__title')?.textContent?.trim() || "";
        const titleOriginal = document.querySelector('.b-post__origtitle')?.textContent?.trim() || "";
        const posterUrl = document.querySelector('.b-sidecover img') ? (document.querySelector('.b-sidecover img') as HTMLImageElement).src : "";
        const yearMatch = document.querySelector('.b-post__info a[href*="/year/"]')?.textContent?.match(/\d{4}/);
        const year = yearMatch ? Number(yearMatch[0]) : 0;

        const translations = [...document.querySelectorAll('.b-translator__item')].map(el => {
            return {
                name: el.textContent?.trim() || "",
                active: el.classList.contains('active'),
                data_translator_id: el.getAttribute('data-translator_id'),
                url: (el as HTMLAnchorElement).href
            }
        });


        var seasons: any[] = [];

        var episodes: any[] = [];

        const seasonsElement = document.querySelector("#simple-seasons-tabs")
        if (seasonsElement) {
            seasons = [...seasonsElement.querySelectorAll(".b-simple_season__item")].map(el => {
                return {
                    name: el.textContent?.trim() || "",
                    active: el.classList.contains('active'),
                    url: (el as HTMLAnchorElement).href,
                    data_tab_id: el.getAttribute('data-tab_id'),
                };
            });

            const activeEpisodeItem = document.querySelector(".b-simple_episode__item.active");
            const episodesElement = activeEpisodeItem ? activeEpisodeItem.parentElement : null;
            if (episodesElement) {
                episodes = [...episodesElement.querySelectorAll(".b-simple_episode__item")].map(el => {
                    return {
                        name: el.textContent?.trim() || "",
                        active: el.classList.contains('active'),
                        url: (el as HTMLAnchorElement).href,
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
    }, { timeout: 120000, strategies: ['domcontentloaded', 'networkidle'], waitForSelector: '.b-post__title', selectorTimeout: 15000, evalArg: { data_translator_id: data_translator_id, parseStreamsFuncString: parseMp4Streams.toString() } });

    const isShow = data.seasons.length > 0;

    const activeEpisode = data.episodes.find((x: any) => x.active);
    const seasonAndEipisode = activeEpisode ? `S${activeEpisode.data_season_id}E${activeEpisode.data_episode_id} ` : "";

    let yearStr = "";
    if (!isShow) {
        yearStr = ` (${data.year}) `;
    }

    return {
        isShow: isShow,
        year: data.year,
        title: data.title,
        titleOriginal: data.titleOriginal,
        posterUrl: data.posterUrl,
        streams: data.streams.map((originalStream: any) => {
            return {
                quality: originalStream.quality,
                mp4FileName: `${data.titleOriginal || data.title} ${yearStr}${seasonAndEipisode}[${originalStream.quality}].mp4`,
                mp4: originalStream.mp4,
                mp4Android: `intent:${originalStream.mp4}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`,
            }
        }),
        translations: data.translations,
        seasons: data.seasons,
        episodes: data.episodes,
        debug: data.debug
    };
};