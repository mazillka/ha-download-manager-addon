export default function ParseSearchFunc() {
  function parseYearString(str) {
    if (!str) return "N/A";
    const yearPart = str.split(",")[0].trim();

    const range = yearPart.match(/(\d{4})\s*[–-]\s*(\.\.\.|\d{4})/);
    if (range) return `${range[1]} – ${range[2]}`;

    const singleYear = yearPart.match(/\d{4}/);
    if (singleYear) return singleYear[0];

    return "N/A";
  }

  function parseCategory(catEl) {
    if (!catEl) return null;
    const cat = [...catEl.classList].find((c) => c !== "cat");
    return cat
      ? cat
          .replace("films", "film")
          .replace("cartoons", "cartoon")
          .replace("animation", "anime")
      : null;
  }

  return [...document.querySelectorAll(".b-content__inline_item")].map((el) => {
    const linkEl = el.querySelector(".b-content__inline_item-link a");
    const textDiv = el.querySelector(".b-content__inline_item-link div");
    const cover = el.querySelector(".b-content__inline_item-cover img");
    const catEl = el.querySelector(".cat");

    return {
      name: linkEl?.textContent?.trim() || null,
      url: linkEl?.href || null,
      image: cover?.src || null,
      category: parseCategory(catEl),
      year: parseYearString(textDiv?.textContent?.trim()),
    };
  });
}
