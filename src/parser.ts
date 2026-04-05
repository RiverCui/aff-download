import { load } from "cheerio";

export interface StoryMeta {
  title: string;
  author: string;
}

export interface ChapterInfo {
  title: string;
  url: string;
}

export interface ChapterContent {
  title: string;
  html: string;
  text: string;
}

export const parseStoryPage = (
  html: string
): { meta: StoryMeta; chapters: ChapterInfo[] } => {
  const $ = load(html);

  // Extract title
  const title =
    $("h1#story-title").text().trim() ||
    $("title").text().split(" - ")[0].trim() ||
    "Untitled";

  // Extract author
  const author =
    $('span[property="author"] a').text().trim() ||
    $(".author-name").text().trim() ||
    "Unknown";

  // Extract chapter list — primary: <select name='chapter-nav'>
  const chapters: ChapterInfo[] = [];

  const selectOptions = $("select[name='chapter-nav'] option");
  if (selectOptions.length > 0) {
    selectOptions.each((_, el) => {
      const $el = $(el);
      const value = $el.attr("value");
      const chTitle = $el.text().trim();
      if (value && chTitle) {
        const url = value.startsWith("http")
          ? value
          : value.startsWith("/")
            ? value
            : `/story/view/${value}`;
        chapters.push({ title: chTitle, url });
      }
    });
  } else {
    // Fallback: <div class='widget--chapters'> links
    $("div.widget--chapters a").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      const chTitle = $el.text().trim();
      if (href && chTitle) {
        chapters.push({ title: chTitle, url: href });
      }
    });
  }

  return { meta: { title, author }, chapters };
};

export const parseChapterPage = (html: string): ChapterContent => {
  const $ = load(html);

  const title = $("h1#chapter-title").text().trim() || "Untitled Chapter";

  const $body = $("div#user-submitted-body");
  const contentHtml = $body.html() ?? "";
  const contentText = $body.text().trim();

  return { title, html: contentHtml, text: contentText };
};
