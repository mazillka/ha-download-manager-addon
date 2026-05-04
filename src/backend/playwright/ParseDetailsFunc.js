export default async function ParseDetailsFunc(evalArg) {
  if (evalArg.translator) {
    const el = document.querySelector(
      `[data-translator_id='${evalArg.translator}']`,
    );
    if (el && !el.classList.contains("active")) {
      el.click();

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (evalArg.season) {
    const el = document.querySelector(`[data-tab_id='${evalArg.season}']`);
    if (el && !el.classList.contains("active")) {
      el.click();

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (evalArg.season && evalArg.episode) {
    const el = document.querySelector(
      `[data-season_id='${evalArg.season}'][data-episode_id='${evalArg.episode}']`,
    );

    if (el && !el.classList.contains("active")) {
      el.click();

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const getUrl = ({ translator, season, episode } = {}) => {
    const url = window.location.origin + window.location.pathname;

    if (translator && season && episode) {
      return `${url}#t:${translator}-s:${season}-e:${episode}`;
    }

    return url;
  };

  const getStreams = async ({
    activeTranslator,
    activeSeason,
    activeEpisode,
  } = {}) => {
    let input = "";
    const streams = [];

    const id = document.querySelector("#post_id")?.value;

    if (id && activeTranslator) {
      const params = new URLSearchParams();
      params.append("id", id);
      params.append("translator_id", activeTranslator.translator);

      if (activeSeason && activeEpisode) {
        params.append("season", activeSeason.season);
        params.append("episode", activeEpisode.episode);
        params.append("action", "get_stream");
      } else {
        params.append("action", "get_movie");
      }

      try {
        const res = await fetch("/ajax/get_cdn_series/", {
          method: "POST",
          body: params,
        });
        const data = await res.json();
        if (data && data.url) {
          input = data.url;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const parts = input.split(/,\s*\[/);

    parts.forEach((part, index) => {
      let chunk = part;

      if (index !== 0) {
        chunk = "[" + chunk;
      }

      const qualityMatch = chunk.match(/\[(.*?)\]/);
      if (!qualityMatch) return;

      const quality = qualityMatch[1];

      if (
        quality &&
        (quality.toLowerCase().includes("premium") ||
          quality.includes("pjs-prem-quality"))
      )
        return;

      const urlMatch = chunk.match(/https?:\/\/[^,\s]+?\.mp4(?!:hls)/);

      if (urlMatch) {
        streams.push({
          quality,
          url: urlMatch[0],
        });
      }
    });

    return streams;
  };

  const getTranslators = () => {
    const translationsEl = document.querySelectorAll(".b-translator__item");

    const translations =
      translationsEl &&
      Array.from(translationsEl).map((el) => {
        const translator = el.getAttribute("data-translator_id");

        return {
          translator,
          name: el?.textContent?.trim(),
          active: el.classList.contains("active"),
          url: el.href || getUrl(translator, 1, 1),
          premium: el.classList.contains("b-prem_translator"),
        };
      });

    return translations || [];
  };

  const getSeasons = (translator) => {
    const seasonsEl = document.querySelectorAll(
      "#simple-seasons-tabs .b-simple_season__item",
    );

    const seasons =
      seasonsEl &&
      Array.from(seasonsEl).map((el) => {
        const season = el.getAttribute("data-tab_id");

        return {
          season,
          name: `Season ${season}`,
          active: el.classList.contains("active"),
          url:
            el.href ||
            getUrl({ translator: translator, season: season, episode: 1 }),
        };
      });

    return seasons || [];
  };

  const getEpisodes = (translator) => {
    const episodesEl = document.querySelectorAll(".b-simple_episode__item");

    const episodes =
      episodesEl &&
      Array.from(episodesEl).map((el) => {
        const episode = el.getAttribute("data-episode_id");
        const season = el.getAttribute("data-season_id");

        return {
          episode,
          name: `Episode ${episode}`,
          active: el.classList.contains("active"),
          season,
          url:
            el.href ||
            getUrl({
              translator: translator,
              season: season,
              episode: episode,
            }),
        };
      });

    return episodes || [];
  };

  const getOtherParts = () => {
    const otherPartsEl = document.querySelectorAll(
      ".b-post__partcontent .b-post__partcontent_item",
    );

    const otherParts =
      otherPartsEl &&
      Array.from(otherPartsEl).map((el) => ({
        num: el.querySelector(".num")?.textContent?.trim(),
        title: el.querySelector(".title")?.textContent?.trim(),
        year: el.querySelector(".year")?.textContent?.trim().replace(/\D/g, ""),
        current: el.classList.contains("current"),
        url: el.getAttribute("data-url"),
      }));

    return otherParts || [];
  };

  const isTVSeries = !!document.querySelector("#simple-seasons-tabs");

  const name = document.querySelector(".b-post__title")?.textContent?.trim();
  const originalName = document
    .querySelector(".b-post__origtitle")
    ?.textContent?.trim();
  const image = document.querySelector(".b-sidecover img")?.src;

  const releaseYear = document
    .querySelector('.b-post__info a[href*="/year/"]')
    ?.textContent?.match(/\d{4}/)?.[0];

  const description = document
    .querySelector(".b-post__description_text")
    ?.textContent?.trim();

  const translators = getTranslators().filter((t) => !t.premium);
  const activeTranslator =
    translators.find((t) => t.active) || translators[0] || null;

  const seasons = activeTranslator
    ? getSeasons(activeTranslator.translator)
    : [];
  const activeSeason = seasons.find((s) => s.active) || null;

  const episodes = activeTranslator
    ? getEpisodes(activeTranslator.translator).filter(
        (e) => activeSeason && e.season == activeSeason.season,
      )
    : [];
  const activeEpisode = episodes.find((e) => e.active) || null;

  const streams = await getStreams({
    activeTranslator,
    activeSeason,
    activeEpisode,
  });

  const otherParts = getOtherParts();

  const urlExist = !!document.querySelector("#translators-list a")?.href;

  const url = urlExist
    ? getUrl()
    : getUrl({
        translator: activeTranslator?.translator,
        season: activeEpisode?.season,
        episode: activeEpisode?.episode,
      });

  // const url = isTVSeries
  //   ? getUrl({
  //       translator: activeTranslator.translator,
  //       season: activeEpisode?.season,
  //       episode: activeEpisode?.episode,
  //     })
  //   : getUrl();

  return {
    debug: {
      isTVSeries,
      url: url,

      evalArg: evalArg,

      ...(activeTranslator && { activeTranslator: activeTranslator }),
      ...(activeSeason && { activeSeason: activeSeason }),
      ...(activeEpisode && { activeEpisode: activeEpisode }),
      ...(urlExist && { urlExist: urlExist }),

      ...(activeTranslator && { totalTranslations: translators.length }),
      ...(activeSeason && { totalSeasons: seasons.length }),
      ...(activeSeason && { totalEpisodes: episodes.length }),
      ...(streams && { totalStreams: streams.length }),
      ...(otherParts && { totalOtherParts: otherParts.length }),
    },

    url: url,
    isTVSeries: isTVSeries,
    releaseYear,
    name,
    originalName,
    description,
    image,
    category: evalArg.category,
    otherParts: otherParts,
    translations: translators,

    seasons: seasons,
    episodes: episodes,

    streams: streams.map((s) => ({
      quality: s.quality,
      url: s.url,
      ///
      name,
      originalName,
      translator: activeTranslator?.translator,
      translatorName: activeTranslator?.name,
      episode: activeEpisode?.episode,
      season: activeEpisode?.season,
    })),
  };
}
