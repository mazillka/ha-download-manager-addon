import type { Stream } from "../../common/interfaces";

export default async function ParseHelper(evalArg: any) {
  const TRASH_CHARS = ["@", "#", "!", "^", "$"];
  const TRASH_REGEX = (() => {
    const codes: string[] = [];

    for (const a of TRASH_CHARS) {
      for (const b of TRASH_CHARS) {
        codes.push(btoa(a + b));
        for (const c of TRASH_CHARS) {
          codes.push(btoa(a + b + c));
        }
      }
    }

    return new RegExp(codes.join("|"), "g");
  })();

  const triggerAll = (el?: Element | null): void => {
    if (!el) return;

    // @ts-ignore
    el.focus?.();

    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(
      (type) =>
        el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })),
    );
  };

  const parseStreams = (data: string): Stream[] => {
    if (!data) return [];

    let cleaned = data
      .replace("#h", "")
      .replaceAll("//_//", "")
      .replace(TRASH_REGEX, "");

    let decoded: string;
    try {
      decoded = atob(cleaned);
    } catch {
      console.error("Failed to decode stream data");
      return [];
    }

    const result: Stream[] = [];
    const qualityRegex = /\[(\d+p[^\]]*)\]/g;
    const urlRegex = /https?:\/\/[^\s,]+\.mp4/g;

    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let currentQuality = "";

    while ((match = qualityRegex.exec(decoded))) {
      const chunk = decoded.slice(lastIndex, match.index);

      if (currentQuality) {
        const url = chunk.match(urlRegex)?.[0];
        if (url) result.push({ quality: currentQuality, mp4: url });
      }

      currentQuality = match[1].trim();
      lastIndex = qualityRegex.lastIndex;
    }

    if (currentQuality) {
      const tail = decoded.slice(lastIndex);
      const url = tail.match(urlRegex)?.[0];
      if (url) result.push({ quality: currentQuality, mp4: url });
    }

    return result;
  };

  /* ================================================== */

  if (evalArg?.data_translator_id) {
    triggerAll(
      document.querySelector(
        `[data-translator_id="${evalArg.data_translator_id}"]`,
      ),
    );
  }

  const qs = <T extends Element>(s: string) =>
    document.querySelector(s) as T | null;

  const title = qs(".b-post__title")?.textContent?.trim() ?? "";
  const titleOriginal = qs(".b-post__origtitle")?.textContent?.trim() ?? "";
  const posterUrl = qs<HTMLImageElement>(".b-sidecover img")?.src ?? "";

  const year =
    Number(
      qs('.b-post__info a[href*="/year/"]')?.textContent?.match(/\d{4}/)?.[0],
    ) || 0;

  const translations = Array.from(
    document.querySelectorAll(".b-translator__item"),
  ).map((el) => ({
    name: el.textContent?.trim() ?? "",
    active: el.classList.contains("active"),
    data_translator_id: el.getAttribute("data-translator_id"),
    url: (el as HTMLAnchorElement).href,
  }));

  const seasonsRoot = qs("#simple-seasons-tabs");
  const seasons = seasonsRoot
    ? Array.from(seasonsRoot.querySelectorAll(".b-simple_season__item")).map(
        (el) => ({
          name: el.textContent?.trim() ?? "",
          active: el.classList.contains("active"),
          url: (el as HTMLAnchorElement).href,
          data_tab_id: el.getAttribute("data-tab_id"),
        }),
      )
    : [];

  const activeEpisodeParent = qs(
    ".b-simple_episode__item.active",
  )?.parentElement;

  const episodes = activeEpisodeParent
    ? Array.from(
        activeEpisodeParent.querySelectorAll(".b-simple_episode__item"),
      ).map((el) => ({
        name: el.textContent?.trim() ?? "",
        active: el.classList.contains("active"),
        url: (el as HTMLAnchorElement).href,
        data_season_id: el.getAttribute("data-season_id"),
        data_episode_id: el.getAttribute("data-episode_id"),
      }))
    : [];

  const activeEpisode = episodes.find((e) => e.active);
  const isShow = seasons.length > 0;

  const seasonEpisode = activeEpisode
    ? `S${activeEpisode.data_season_id}E${activeEpisode.data_episode_id} `
    : "";

  const yearStr = isShow ? "" : ` (${year}) `;

  // @ts-ignore
  const streams: Stream[] =
    typeof CDNPlayerInfo !== "undefined"
      ? parseStreams(CDNPlayerInfo.streams)
      : [];

  return await {
    isShow,
    year,
    title,
    titleOriginal,
    posterUrl,
    translations,
    seasons,
    episodes,
    streams: streams.map((s) => ({
      quality: s.quality,
      mp4: s.mp4,
      mp4FileName: `${titleOriginal || title} ${yearStr}${seasonEpisode}[${s.quality}].mp4`,
      mp4Android: `intent:${s.mp4}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`,
    })),
  };
}
