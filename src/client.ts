import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE_URL = "https://www.asianfanfics.com";
const CF_TIMEOUT = 120000;
const BROWSER_DATA_DIR = ".browser-data";

let context: BrowserContext;
let page: Page;

export const cleanBrowserData = async (): Promise<void> => {
  if (existsSync(BROWSER_DATA_DIR)) {
    await rm(BROWSER_DATA_DIR, { recursive: true });
    console.log("✓ Browser data cleared");
  }
};

export const initBrowser = async (): Promise<void> => {
  context = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
    channel: "chrome",
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
    ],
    ignoreDefaultArgs: ["--enable-automation", "--no-sandbox"],
  });

  page = context.pages()[0] || await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
};

const waitForCloudflare = async (): Promise<void> => {
  const title = await page.title();
  if (!title.includes("Just a moment")) return;

  console.log("  Waiting for Cloudflare challenge...");
  await page.waitForFunction(
    () => !document.title.includes("Just a moment"),
    null,
    { timeout: CF_TIMEOUT },
  );
};

const gotoPage = async (url: string): Promise<void> => {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: CF_TIMEOUT });
  await waitForCloudflare();
};

export const login = async (
  username: string,
  password: string,
): Promise<void> => {
  console.log("Navigating to AFF...");
  await gotoPage(`${BASE_URL}/`);

  const isLoggedIn = await page.evaluate(() =>
    document.body.innerHTML.includes("isLoggedIn = true"),
  );

  if (isLoggedIn) {
    console.log("✓ Already logged in");
    return;
  }

  await gotoPage(`${BASE_URL}/login`);
  await page.waitForSelector("#username", { timeout: 10000 });

  await page.fill("#username", username);
  await page.fill("#password-field", password);
  await page.click("button.button--bright.button--big");

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30000,
  }).catch(() => {});
  await page.waitForTimeout(2000);
  await waitForCloudflare();

  const currentUrl = page.url();
  if (currentUrl.includes("logout")) {
    throw new Error("Login rejected by server — try: aff-download --clean");
  }

  const html = await page.content();
  if (html.includes("isLoggedIn = false") || html.includes("Login - Asianfanfics")) {
    throw new Error("Login failed — check AFF_USERNAME and AFF_PASSWORD in .env");
  }

  console.log("✓ Logged in successfully");
};

export const confirmAge = async (): Promise<void> => {
  try {
    await gotoPage(`${BASE_URL}/account/mark_over_18`);
    console.log("✓ Age verification confirmed");
  } catch {
    console.log("✓ Age verification skipped");
  }
};

export const fetchPage = async (path: string): Promise<string> => {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  await gotoPage(url);

  try {
    await page.waitForSelector("#user-submitted-body", { timeout: 10000 });
  } catch {
    // Not a chapter page or different structure
  }

  return page.content();
};

export const closeBrowser = async (): Promise<void> => {
  await context?.close();
};

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
