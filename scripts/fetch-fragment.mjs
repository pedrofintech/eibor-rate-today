/*
 * Renders the CBUAE EIBOR page with a real headless Chromium (Playwright) and
 * saves the rendered HTML to eibor-fragment.html, which update-eibor.mjs then
 * parses. Needed because the CBUAE endpoint sits behind a JS bot wall that
 * blocks plain fetches (403).
 *
 * The rate tables are injected by an XHR (GetEiborData) after the page loads,
 * and the first one sits in a hidden tab ("Table" - the default tab is "Graph").
 * A visibility wait on "table td" therefore never succeeds, so we wait until the
 * page HTML holds a rates row instead (the same pattern the parser uses). When a
 * load comes back without rates (bot wall, slow XHR, network blip on the runner)
 * we retry in a fresh browser context, up to ATTEMPTS times.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const OUT = new URL("../eibor-fragment.html", import.meta.url);
const PAGE = process.env.EIBOR_PAGE_URL || "https://www.centralbank.ae/en/forex-eibor/eibor-rates/";
const ATTEMPTS = 3;
const NAV_TIMEOUT_MS = 60000;
const ROW_WAIT_MS = 45000;
const RETRY_PAUSE_MS = 15000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/* Same row shape update-eibor.mjs parses: <tr><td>10 July 2026</td> + 6 numeric tds */
const ROW_RE = /<tr>\s*<td[^>]*>\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*<\/td>(?:\s*<td[^>]*>\s*[\d.]+\s*<\/td>){6}/g;
const countRows = (html) => (html.match(ROW_RE) || []).length;
const oneLine = (s, max = 120) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max);
/* Escapes text for a GitHub Actions workflow command (::warning::...) */
const cmdText = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderOnce(browser, n) {
  const t0 = Date.now();
  const diag = { page: "no response", xhr: "not seen", title: "" };
  let html = "";
  const ctx = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 900 },
    locale: "en-US",
    timezoneId: "Asia/Dubai"
  });
  try {
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
    page.on("response", (res) => {
      if (/GetEiborData/i.test(res.url())) diag.xhr = "HTTP " + res.status();
    });
    const res = await page.goto(PAGE, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    diag.page = res ? "HTTP " + res.status() : "no response";
    try {
      /* wait until the page holds at least one row the parser can read (hidden or not) */
      await page.waitForFunction(
        (src) => new RegExp(src).test(document.documentElement.outerHTML),
        ROW_RE.source,
        { timeout: ROW_WAIT_MS, polling: 500 }
      );
    } catch {
      /* no rates row showed up in time; the row count below decides */
    }
    await page.waitForTimeout(1500);
    html = await page.content();
    diag.title = oneLine(await page.title(), 80);
  } catch (e) {
    /* first line only: Playwright appends a multi-line, colour-coded call log */
    diag.page = "failed: " + oneLine(String(e.message).split("\n")[0]);
  } finally {
    await ctx.close().catch(() => {});
  }
  const rows = countRows(html);
  console.log(
    "[fragment] attempt " + n + "/" + ATTEMPTS + ":", rows, "rows | page", diag.page, "| GetEiborData", diag.xhr,
    '| title "' + diag.title + '" |', html.length, "bytes |", Date.now() - t0, "ms"
  );
  return { rows, html, diag };
}

const browser = await chromium.launch({
  args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
});
let best = null;
try {
  for (let n = 1; n <= ATTEMPTS; n++) {
    const r = await renderOnce(browser, n);
    if (!best || r.rows > best.rows || (!best.html && r.html)) best = r;
    if (r.rows) break;
    if (n < ATTEMPTS) await sleep(RETRY_PAUSE_MS * n);
  }
} finally {
  await browser.close();
}

if (best.html) writeFileSync(OUT, best.html);
if (!best.rows) {
  /* Shows up as an annotation on the run, so the cause is visible without opening the log. */
  console.log(
    "::warning title=EIBOR browser render::" + cmdText(
      "No rates in the rendered CBUAE page after " + ATTEMPTS + " attempts (page " + best.diag.page +
      "; GetEiborData " + best.diag.xhr + '; title "' + best.diag.title + '").'
    )
  );
  process.exit(1);
}
console.log("[fragment] saved", best.html.length, "bytes |", best.rows, "rows");
