import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import epubModule from "epub-gen-memory";

type EpubFn = (options: { title: string; author: string }, chapters: { title: string; content: string }[]) => Promise<Buffer>;
const mod = epubModule as unknown as { default?: EpubFn } | EpubFn;
const epub: EpubFn = typeof mod === "function" ? mod : (mod.default as EpubFn);
import type { StoryMeta, ChapterContent } from "./parser.js";

const sanitizeFilename = (name: string): string =>
  name
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

const ensureDir = async (dir: string): Promise<void> => {
  await mkdir(dir, { recursive: true });
};

export const writeEpub = async (
  meta: StoryMeta,
  chapters: ChapterContent[]
): Promise<string> => {
  const safeName = sanitizeFilename(meta.title);
  const dir = join("downloads", safeName);
  await ensureDir(dir);

  const filePath = join(dir, `${safeName}.epub`);

  const epubChapters = chapters.map((ch) => ({
    title: ch.title,
    content: ch.html || `<p>${ch.text}</p>`,
  }));

  const buffer = await epub(
    {
      title: meta.title,
      author: meta.author,
    },
    epubChapters
  );

  await writeFile(filePath, buffer);
  return filePath;
};

export const writeTxt = async (
  meta: StoryMeta,
  chapters: ChapterContent[]
): Promise<string> => {
  const safeName = sanitizeFilename(meta.title);
  const dir = join("downloads", safeName);
  await ensureDir(dir);

  const filePath = join(dir, `${safeName}.txt`);

  const lines: string[] = [
    meta.title,
    `Author: ${meta.author}`,
    "",
    "========================================",
    "",
  ];

  for (const ch of chapters) {
    lines.push(ch.title);
    lines.push("----------------------------------------");
    lines.push(ch.text);
    lines.push("");
    lines.push("========================================");
    lines.push("");
  }

  await writeFile(filePath, lines.join("\n"), "utf-8");
  return filePath;
};
