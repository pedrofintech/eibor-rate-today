/*
 * Renders the CBUAE EIBOR page with a real headless Chromium (Playwright) and
 * saves the rendered HTML to eibor-fragment.html, which update-eibor.mjs then
 * parses. Needed because the CBUAE endpoint sits behind a JS bot wall that
 * blocks plain fetches (403).
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const OUT = new URL("../eibor-fragment.html", import.meta.url);
const PAGE = "https://www.centralbank.ae/en/forex-eibor/eibor-rates/";

const browser = await chromium.launch({
  args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
});
try {
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
    locale: "en-US",
    timezoneId: "Asia/Dubai"
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  await page.goto(PAGE, { waitUntil: "domcontentloaded", timeout: 60000 });
  try {
    await page.waitForSelector("table td", { timeout: 45000 });
  } catch {
    console.error("[fragment] rates table never appeared; title:", await page.title());
  }
  await page.waitForTimeout(1500);
  const html = await page.content();
  writeFileSync(OUT, html);
  console.log("[fragment] saved", html.length, "bytes | hasTd:", /<td/i.test(html), "| has2026:", html.indexOf("2026") > -1);
} finally {
  await browser.close();
}
