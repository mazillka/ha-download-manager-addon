export default function ParseSearchFunc() {
  function parseYearString(str) {
    const yearPart = str.split(",")[0].trim();

    const openRange = yearPart.match(/(\d{4})\s*[–-]\s*(\.\.\.)/);
    if (openRange) return `${openRange[1]} – ...`;

    const closedRange = yearPart.match(/(\d{4})\s*[–-]\s*(\d{4})/);
    if (closedRange) return `${closedRange[1]} – ${closedRange[2]}`;

    const singleYear = yearPart.match(/\d{4}/);
    if (singleYear) return singleYear[0];

    return "N/A";
  }

  function parseCategory(catEl) {
    return catEl
      ?.getAttribute("class")
      ?.split(" ")
      .filter((c) => c !== "cat")
      .map((cat) => {
        return cat
          .replace("films", "film")
          .replace("cartoons", "cartoon")
          .replace("animation", "anime");
      })[0];
  }

  return [...document.querySelectorAll(".b-content__inline_item")].map((el) => {
    const linkEl = el.querySelector(".b-content__inline_item-link a");
    const textDiv = el.querySelector(".b-content__inline_item-link div");
    const cover = el.querySelector(".b-content__inline_item-cover img");
    const catEl = el.querySelector(".cat");

    return {
      name: linkEl?.textContent?.trim(),
      url: linkEl?.getAttribute("href"),
      image: cover?.getAttribute("src"),
      category: parseCategory(catEl),
      year: parseYearString(textDiv?.textContent?.trim()),
    };
  });
}
