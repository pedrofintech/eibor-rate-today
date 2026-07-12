/*
 * Updates eibor-data.json with the CBUAE daily EIBOR fixings.
 * Runs on GitHub Actions (Node 20+, native fetch, no dependencies) - same
 * pattern as the LF euribor-hoje bot.
 *
 * Fetch strategy (first that yields rows wins):
 *   1. eibor-fragment.html pre-fetched by the workflow (curl-impersonate), if present
 *   2. direct fetch of the CBUAE endpoint (blocked by their bot protection as of 2026-07,
 *      kept in case it opens up)
 *   3. r.jina.ai rendered fetch of the EIBOR page (real browser, passes the bot wall)
 *
 * Also maintains eibor-archive.json (every daily fixing collected) and recomputes
 * the monthly averages ("history") that feed the 1-year chart.
 * Flag --from-archive-ok (seed mode): don't fail if no live rows; rebuild from archive.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const URL_DATA = "https://www.centralbank.ae/umbraco/Surface/Eibor/GetEiborData";
const URL_PAGE = "https://www.centralbank.ae/en/forex-eibor/eibor-rates/";
const URL_JINA = "https://r.jina.ai/" + URL_PAGE;
const DATA = new URL("../eibor-data.json", import.meta.url);
const ARCH = new URL("../eibor-archive.json", import.meta.url);
const LOCAL_HTML = new URL("../eibor-fragment.html", import.meta.url);
const MONTHS = { January:"01", February:"02", March:"03", April:"04", May:"05", June:"06", July:"07", August:"08", September:"09", October:"10", November:"11", December:"12" };
const MONTH_RE = "(January|February|March|April|May|June|July|August|September|October|November|December)";
const UA = { headers: {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "text/html, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": URL_PAGE,
  "X-Requested-With": "XMLHttpRequest"
} };

const KEYS = ["on", "w1", "m1", "m3", "m6", "m12"];
const TOLERANT = process.argv.includes("--from-archive-ok");
const isNum = (v) => typeof v === "number" && isFinite(v);
const realRow = (r) => KEYS.every((k) => isNum(r[k]));
const dkey = (d) => d.split("/").reverse().join("");

function makeRec(day, monthName, year, vals) {
  const mm = MONTHS[monthName];
  if (!mm || vals.length !== 6 || vals.some((v) => !isFinite(v))) return null;
  const rec = { d: String(day).padStart(2, "0") + "/" + mm + "/" + year };
  KEYS.forEach((k, i) => (rec[k] = vals[i]));
  return rec;
}

/* HTML fragment: <tr> <td>10 July 2026</td> <td>on</td>...6 numeric tds...<td>value date</td> */
function parseHtmlRows(html) {
  const rows = [];
  const re = /<tr>\s*<td[^>]*>\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*<\/td>((?:\s*<td[^>]*>\s*[\d.]+\s*<\/td>){6})/g;
  let m;
  while ((m = re.exec(html))) {
    const vals = [...m[4].matchAll(/>\s*([\d.]+)\s*</g)].map((x) => parseFloat(x[1]));
    const rec = makeRec(m[1], m[2], m[3], vals);
    if (rec) rows.push(rec);
  }
  return rows;
}

/* Rendered text (jina): "10 July 2026 3.477440 3.645960 3.723810 3.900400 4.037500 4.170620 14 July 2026" */
function parseTextRows(text) {
  const rows = [];
  const re = new RegExp("(\\d{1,2})\\s+" + MONTH_RE + "\\s+(\\d{4})((?:\\s+-?\\d+\\.\\d+){6})", "g");
  let m;
  while ((m = re.exec(text))) {
    const vals = m[4].trim().split(/\s+/).map(parseFloat);
    const rec = makeRec(m[1], m[2], m[3], vals);
    if (rec) rows.push(rec);
  }
  return rows;
}

async function tryFetch(label, url, headers) {
  try {
    const res = await fetch(url, headers);
    if (!res.ok) { console.error("[eibor]", label, "HTTP", res.status); return ""; }
    return await res.text();
  } catch (e) {
    console.error("[eibor]", label, "failed:", e.message);
    return "";
  }
}

async function getRows() {
  if (existsSync(LOCAL_HTML)) {
    const rows = parseHtmlRows(readFileSync(LOCAL_HTML, "utf8"));
    console.log("[eibor] pre-fetched fragment ->", rows.length, "rows");
    if (rows.length) return rows;
  }
  let body = await tryFetch("direct", URL_DATA, UA);
  let rows = parseHtmlRows(body);
  console.log("[eibor] direct ->", rows.length, "rows");
  if (rows.length) return rows;

  body = await tryFetch("jina", URL_JINA, { headers: { "User-Agent": UA.headers["User-Agent"] } });
  rows = parseHtmlRows(body);
  if (!rows.length) rows = parseTextRows(body);
  console.log("[eibor] jina ->", rows.length, "rows");
  return rows;
}

async function main() {
  const rows = await getRows();
  if (!rows.length && !TOLERANT) throw new Error("No daily rows from any source (CBUAE layout changed or all sources blocked?)");

  // Archive: accumulate every real daily fixing
  const arch = existsSync(ARCH) ? JSON.parse(readFileSync(ARCH, "utf8")) : { rows: [] };
  const have = new Set(arch.rows.map((r) => r.d));
  rows.forEach((r) => { if (!have.has(r.d)) arch.rows.push(r); });
  arch.rows = arch.rows.filter(realRow).sort((a, b) => dkey(a.d).localeCompare(dkey(b.d)));

  // Data file: series = last 45 days; history = monthly averages (last 13 months incl. current partial)
  const data = JSON.parse(readFileSync(DATA, "utf8"));
  data.series = arch.rows.slice(-45);
  if (!data.series.length) throw new Error("Archive is empty - nothing to publish");
  data.referenceDate = data.series[data.series.length - 1].d;

  const byMonth = {};
  arch.rows.forEach((r) => {
    const ym = r.d.slice(6) + "-" + r.d.slice(3, 5);
    (byMonth[ym] = byMonth[ym] || []).push(r);
  });
  data.history = Object.keys(byMonth).sort().slice(-13).map((ym) => {
    const rs = byMonth[ym];
    const avg = (k) => Math.round((rs.reduce((s, r) => s + r[k], 0) / rs.length) * 1e5) / 1e5;
    return { d: ym, m1: avg("m1"), m3: avg("m3"), m6: avg("m6"), m12: avg("m12") };
  });

  writeFileSync(DATA, JSON.stringify(data, null, 2) + "\n");
  writeFileSync(ARCH, JSON.stringify(arch) + "\n");
  const last = data.series[data.series.length - 1];
  console.log("[eibor] OK ->", data.referenceDate, "| archive", arch.rows.length, "days | 3m", last.m3, "| history", data.history.length, "months");
}

main().catch((e) => { console.error("[eibor] FAILED:", e.message); process.exit(1); });
