(function () {
  window.GetSearchResults = function () {
    if (typeof document === "undefined") return [];

    const items = document.querySelectorAll(".b-content__inline_item");
    const len = items.length;
    if (len === 0) return [];

    const results = new Array(len);
    const yearRegex = /\b\d{4}\b/;

    for (let i = 0; i < len; i++) {
      const item = items[i];

      const linkBlock = item.querySelector(".b-content__inline_item-link");
      const coverBlock = item.querySelector(".b-content__inline_item-cover");

      const a = linkBlock && linkBlock.querySelector("a");
      const img = coverBlock && coverBlock.querySelector("img");
      const cat = coverBlock && coverBlock.querySelector(".cat");

      const text = linkBlock ? linkBlock.textContent : "";
      const match = text && yearRegex.exec(text);

      results[i] = {
        title: a && a.textContent ? a.textContent.trim() : "",
        year: match ? match[0] : "",
        pageUrl: a ? a.href : "#",
        posterUrl: img ? img.src : "",
        category: cat && cat.textContent ? cat.textContent.trim() : "",
      };
    }

    return results;
  };
})();
