export default function SearchHelper() {
  return [...document.querySelectorAll(".b-content__inline_item")].map(
    (item) => {
      const title =
        item
          .querySelector(".b-content__inline_item-link")
          ?.textContent?.trim() || "No title";

      const element = item.querySelector(".b-content__inline_item-cover");

      const pageUrl =
        (element?.querySelector("a") as HTMLAnchorElement)?.href || "#";
      const posterUrl =
        (element?.querySelector("img") as HTMLImageElement)?.src || "";

      const category =
        element?.querySelector(".cat")?.textContent?.trim() || "";

      return {
        title,
        pageUrl,
        posterUrl,
        category,
      };
    }
  );
}
