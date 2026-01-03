import type { Stream } from "../interfaces/index";

export default async function ParseHelper(evalArg: any) {
  const TriggerAll = (el: Element | null): void => {
    if (!el) {
      return;
    }

    // @ts-ignore
    el.focus();

    const events = [
      "pointerdown",
      "mousedown",
      "pointerup",
      "mouseup",
      "click",
    ];

    events.forEach((type) => {
      el.dispatchEvent(
        new Event(type, {
          bubbles: true,
          cancelable: true,
        })
      );
    });
  };

  const StreamParser = (data: string): Stream[] => {
    const trashList = ["@", "#", "!", "^", "$"];

    function combinations(arr: string[], n: number): string[][] {
      if (n === 1) {
        return arr.map((a) => [a]);
      }
      const smaller = combinations(arr, n - 1);
      return arr.flatMap((a) => smaller.map((s) => [...s, a]));
    }

    function unite(arr: string[][]): string[] {
      return arr.map((e) => e.join(""));
    }

    const two = unite(combinations(trashList, 2));
    const three = unite(combinations(trashList, 3));
    const trashCodesSet = two.concat(three);

    let trashString = data.replace("#h", "").split("//_//").join("");
    const trashRegex = new RegExp(
      trashCodesSet.map((i) => btoa(i)).join("|"),
      "g"
    );
    trashString = trashString.replace(trashRegex, "");

    let decoded: string;
    try {
      decoded = atob(trashString);
    } catch (e) {
      console.error("Failed to decode:", trashString);
      return [];
    }

    const result: Stream[] = [];
    const qualityRegex = /\[(\d+p[^\]]*)\]/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let currentQuality: string | null = null;

    while ((match = qualityRegex.exec(decoded)) !== null) {
      const textSegment = decoded.slice(lastIndex, match.index);
      if (currentQuality) {
        const urls = textSegment.match(/https?:\/\/[^\s,]+/g) || [];
        const mp4Url = urls.find((url) => url.endsWith(".mp4")) || null;
        if (mp4Url) {
          result.push({ quality: currentQuality, mp4: mp4Url });
        }
      }
      currentQuality = match[1].trim();
      lastIndex = match.index + match[0].length;
    }

    const remainingText = decoded.slice(lastIndex);
    if (currentQuality) {
      const urls = remainingText.match(/https?:\/\/[^\s,]+/g) || [];
      const mp4Url = urls.find((url) => url.endsWith(".mp4")) || null;
      if (mp4Url) {
        result.push({ quality: currentQuality, mp4: mp4Url });
      }
    }

    return result;
  };

  const getStreams = (): Stream[] => {
    let res: Stream[] = [];

    // @ts-ignore
    if (typeof CDNPlayerInfo !== "undefined" && CDNPlayerInfo.streams) {
      // @ts-ignore
      res = StreamParser(CDNPlayerInfo.streams);
    }

    return res;
  };

  if (
    evalArg !== null &&
    evalArg !== undefined &&
    evalArg.data_translator_id !== null &&
    evalArg.data_translator_id !== undefined &&
    typeof evalArg.data_translator_id !== "undefined"
  ) {
    for (let i = 0; i < 20; i++) {
      const translation = document.querySelector(
        `[data-translator_id="${evalArg.data_translator_id}"]`
      );

      if (translation) {
        TriggerAll(translation);

        await new Promise((r) => setTimeout(r, 250));

        if (translation.classList.contains("active")) {
          break;
        }
      } else {
        break;
      }
    }
  }

  const title =
    document.querySelector(".b-post__title")?.textContent?.trim() || "";
  const titleOriginal =
    document.querySelector(".b-post__origtitle")?.textContent?.trim() || "";
  const posterUrl =
    (document.querySelector(".b-sidecover img") as HTMLImageElement)?.src || "";

  const yearMatch = document
    .querySelector('.b-post__info a[href*="/year/"]')
    ?.textContent?.match(/\d{4}/);
  const year = yearMatch ? Number(yearMatch[0]) : 0;

  const translations = [
    ...document.querySelectorAll(".b-translator__item"),
  ].map((el) => {
    return {
      name: el.textContent?.trim() || "",
      active: el.classList.contains("active"),
      data_id: el.getAttribute("data-id"),
      data_translator_id: el.getAttribute("data-translator_id"),
      is_camrip: el.getAttribute("data-camrip"),
      is_ads: el.getAttribute("data-ads"),
      is_director: el.getAttribute("data-director"),
      url: (el as HTMLAnchorElement).href,
    };
  });

  var seasons: any[] = [];

  var episodes: any[] = [];

  const seasonsElement = document.querySelector("#simple-seasons-tabs");
  if (seasonsElement) {
    seasons = [
      ...seasonsElement.querySelectorAll(".b-simple_season__item"),
    ].map((el) => {
      return {
        name: el.textContent?.trim() || "",
        active: el.classList.contains("active"),
        url: (el as HTMLAnchorElement).href,
        data_tab_id: el.getAttribute("data-tab_id"),
      };
    });

    const activeEpisodeItem = document.querySelector(
      ".b-simple_episode__item.active"
    );
    const episodesElement = activeEpisodeItem
      ? activeEpisodeItem.parentElement
      : null;
    if (episodesElement) {
      episodes = [
        ...episodesElement.querySelectorAll(".b-simple_episode__item"),
      ].map((el) => {
        return {
          name: el.textContent?.trim() || "",
          active: el.classList.contains("active"),
          url: (el as HTMLAnchorElement).href,
          data_id: el.getAttribute("data-id"),
          data_season_id: el.getAttribute("data-season_id"),
          data_episode_id: el.getAttribute("data-episode_id"),
        };
      });
    }
  }

  const isShow = seasons.length > 0;

  const activeEpisode = episodes.find((x: any) => x.active);
  const seasonAndEipisode = activeEpisode
    ? `S${activeEpisode.data_season_id}E${activeEpisode.data_episode_id} `
    : "";

  let yearStr = "";
  if (!isShow) {
    yearStr = ` (${year}) `;
  }

  await new Promise((r) => setTimeout(r, 2000));

  return {
    isShow: isShow,
    year: year,
    title: title,
    titleOriginal: titleOriginal,
    posterUrl: posterUrl,
    streams: getStreams().map((originalStream: any) => {
      return {
        quality: originalStream.quality,
        mp4FileName: `${
          titleOriginal || title
        } ${yearStr}${seasonAndEipisode}[${originalStream.quality}].mp4`,
        mp4: originalStream.mp4,
        mp4Android: `intent:${originalStream.mp4}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`,
      };
    }),
    translations: translations,
    seasons: seasons,
    episodes: episodes,
  };
}
