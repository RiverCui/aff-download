import "dotenv/config";
import { program } from "commander";
import { initBrowser, login, confirmAge, fetchPage, closeBrowser, cleanBrowserData, delay } from "./client.js";
import { parseStoryPage, parseChapterPage } from "./parser.js";
import type { ChapterContent } from "./parser.js";
import { writeEpub, writeTxt } from "./writer.js";

const DELAY_MS = 1500;

const extractStoryId = (url: string): string => {
  const match = url.match(/\/story\/view\/(\d+)/);
  if (!match) throw new Error(`Invalid story URL: ${url}`);
  return match[1];
};

const downloadStory = async (
  url: string,
  format: "epub" | "txt",
): Promise<void> => {
  const storyId = extractStoryId(url);
  console.log(`\nFetching story ${storyId}...`);

  const storyHtml = await fetchPage(`/story/view/${storyId}`);
  const { meta, chapters } = parseStoryPage(storyHtml);

  console.log(`Title: ${meta.title}`);
  console.log(`Author: ${meta.author}`);
  console.log(`Chapters: ${chapters.length}`);

  if (chapters.length === 0) {
    console.error("No chapters found — the page structure may have changed.");
    return;
  }

  const contents: ChapterContent[] = [];
  let emptyCount = 0;

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    console.log(`  [${i + 1}/${chapters.length}] ${ch.title}`);

    let chapterHtml = await fetchPage(ch.url);
    let content = parseChapterPage(chapterHtml);

    if (!content.text) {
      console.warn(`    ⚠ Empty content, retrying...`);
      await delay(3000);
      chapterHtml = await fetchPage(ch.url);
      content = parseChapterPage(chapterHtml);
      if (!content.text) {
        console.warn(`    ⚠ Still empty after retry`);
        emptyCount++;
      }
    }

    contents.push(content);

    if (i < chapters.length - 1) {
      await delay(DELAY_MS);
    }
  }

  const filePath =
    format === "epub"
      ? await writeEpub(meta, contents)
      : await writeTxt(meta, contents);

  console.log(`✓ Saved to ${filePath}`);
  if (emptyCount > 0) {
    console.warn(`⚠ ${emptyCount} chapter(s) had empty content`);
  }
};

const main = async (): Promise<void> => {
  program
    .name("aff-download")
    .description("Download novels from asianfanfics.com")
    .argument("<urls...>", "Story URLs to download")
    .option("-f, --format <format>", "Output format: epub (default) or txt", "epub")
    .option("--clean", "Clear saved browser data before running")
    .parse();

  const urls = program.args;
  const opts = program.opts();
  const format = opts.format as "epub" | "txt";

  if (!["epub", "txt"].includes(format)) {
    console.error(`Invalid format: ${format}. Use "epub" or "txt".`);
    process.exit(1);
  }

  if (opts.clean) {
    await cleanBrowserData();
  }

  const username = process.env.AFF_USERNAME;
  const password = process.env.AFF_PASSWORD;
  if (!username || !password) {
    console.error("Missing AFF_USERNAME or AFF_PASSWORD in .env");
    process.exit(1);
  }

  await initBrowser();

  try {
    await login(username, password);
    await confirmAge();

    for (const url of urls) {
      try {
        await downloadStory(url, format);
      } catch (err) {
        console.error(
          `Failed to download ${url}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    console.log("\nDone!");
  } finally {
    await closeBrowser();
  }
};

main();
