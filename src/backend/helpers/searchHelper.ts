export default async function SearchHelper() {
  return await [...document.querySelectorAll(".b-content__inline_item")].map(
    (item) => {
      const info = item.querySelector(".b-content__inline_item-link");

      const title = info.querySelector("a").textContent.trim();

      const year = info
        .querySelector("div")
        .textContent?.match(/\b\d{4}\b/)?.[0];

      const element = item.querySelector(".b-content__inline_item-cover");

      const pageUrl =
        (element?.querySelector("a") as HTMLAnchorElement)?.href || "#";
      const posterUrl =
        (element?.querySelector("img") as HTMLImageElement)?.src || "";

      const category =
        element?.querySelector(".cat")?.textContent?.trim() || "";

      return {
        title,
        year,
        pageUrl,
        posterUrl,
        category,
      };
    },
  );
}
