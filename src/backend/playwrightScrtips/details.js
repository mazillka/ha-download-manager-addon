(() => {
  window.GetDetails = function (evalArg) {
    const d = document;

    // ---------- helpers ----------
    const qs = (s, root = d) => root.querySelector(s);
    const qsa = (s, root = d) => root.querySelectorAll(s);
    const text = (el) => el?.textContent?.trim() ?? "";

    // ---------- translator trigger ----------
    if (evalArg?.data_translator_id) {
      triggerAll(
        qs(`[data-translator_id="${evalArg.data_translator_id}"]`)
      );
    }

    // ---------- base info ----------
    const title = text(qs(".b-post__title"));
    const titleOriginal = text(qs(".b-post__origtitle"));
    const posterUrl = qs(".b-sidecover img")?.src ?? "";

    const year = Number(
      text(qs('.b-post__info a[href*="/year/"]')).match(/\d{4}/)?.[0]
    ) || 0;

    // ---------- translations ----------
    const translations = Array.from(qsa(".b-translator__item"), (el) => ({
      name: text(el),
      active: el.classList.contains("active"),
      data_translator_id: el.dataset.translator_id ?? null,
      url: el.href ?? "",
    }));

    // ---------- seasons ----------
    const seasonsRoot = qs("#simple-seasons-tabs");
    const seasons = seasonsRoot
      ? Array.from(
        qsa(".b-simple_season__item", seasonsRoot),
        (el) => ({
          name: text(el),
          active: el.classList.contains("active"),
          url: el.href ?? "",
          data_tab_id: el.dataset.tab_id ?? null,
        })
      )
      : [];

    const isShow = seasons.length > 0;

    // ---------- episodes ----------
    const activeEpisodeParent =
      qs(".b-simple_episode__item.active")?.parentElement;

    const episodes = activeEpisodeParent
      ? Array.from(
        qsa(".b-simple_episode__item", activeEpisodeParent),
        (el) => ({
          name: text(el),
          active: el.classList.contains("active"),
          url: el.href ?? "",
          data_season_id: el.dataset.season_id ?? "",
          data_episode_id: el.dataset.episode_id ?? "",
        })
      )
      : [];

    const activeEpisode = episodes.find((e) => e.active);

    // ---------- naming ----------
    const seasonEpisode = activeEpisode
      ? `S${activeEpisode.data_season_id}E${activeEpisode.data_episode_id} `
      : "";

    const yearStr = isShow ? "" : ` (${year}) `;

    // ---------- streams ----------
    const streams =
      typeof CDNPlayerInfo !== "undefined"
        ? parseStreams(CDNPlayerInfo.streams)
        : [];

    return {
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
        mp4FileName: `${titleOriginal || title}${yearStr}${seasonEpisode}[${s.quality}].mp4`,
        mp4Android: `intent:${s.mp4}#Intent;action=android.intent.action.VIEW;type=video/mp4;end`,
      })),
    };
  };

  // ---------- helpers ----------
  function triggerAll(el) {
    if (!el) return;
    el.focus?.();

    for (const type of [
      "pointerdown",
      "mousedown",
      "pointerup",
      "mouseup",
      "click",
    ]) {
      el.dispatchEvent(
        new Event(type, { bubbles: true, cancelable: true })
      );
    }
  }

  function parseStreams(data) {
    if (!data) return [];

    const TRASH_CHARS = ["@", "#", "!", "^", "$"];

    const trashRegex = new RegExp(
      TRASH_CHARS.flatMap((a) =>
        TRASH_CHARS.flatMap((b) => [
          btoa(a + b),
          ...TRASH_CHARS.map((c) => btoa(a + b + c)),
        ])
      ).join("|"),
      "g"
    );

    let decoded;
    try {
      decoded = atob(
        data
          .replace("#h", "")
          .replaceAll("//_//", "")
          .replace(trashRegex, "")
      );
    } catch {
      return [];
    }

    const result = [];
    const qualityRe = /\[(\d+p[^\]]*)\]/g;
    const urlRe = /https?:\/\/[^\s,]+\.mp4/g;

    let m, last = 0, quality = "";

    while ((m = qualityRe.exec(decoded))) {
      if (quality) {
        const url = decoded.slice(last, m.index).match(urlRe)?.[0];
        if (url) result.push({ quality, mp4: url });
      }
      quality = m[1].trim();
      last = qualityRe.lastIndex;
    }

    if (quality) {
      const url = decoded.slice(last).match(urlRe)?.[0];
      if (url) result.push({ quality, mp4: url });
    }

    return result;
  }
})();
