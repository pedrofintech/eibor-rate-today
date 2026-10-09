/*
 * Updates eibor-data.json with the CBUAE daily EIBOR fixings.
 * Runs on GitHub Actions (Node 20+, native fetch, no dependencies) - same
 * pattern as the LF euribor-hoje bot.
 *
 * Fetch strategy (first that yields rows wins):
 *   1. eibor-fragment.html pre-rendered by the workflow (scripts/fetch-fragment.mjs), if present
 *   2. direct fetch of the CBUAE endpoint (blocked by their bot protection as of 2026-07,
 *      kept in case it opens up)
 *   3. r.jina.ai rendered fetch of the EIBOR page (real browser, passes the bot wall)
 *
 * Also maintains eibor-archive.json (every daily fixing collected) and recomputes
 * the monthly averages ("history") that feed the 1-year chart.
 *
 * When no source yields rows, the run only fails if the site is actually behind:
 *   - latest expected fixing already saved  -> warning, exit 0 (nothing to do)
 *   - EIBOR_LENIENT=true and only the newest fixing is missing -> warning, exit 0
 *     (set by the workflow for the first scheduled run of the day; a later run retries)
 *   - otherwise -> error, exit 1 (GitHub emails the failure)
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
const FETCH_TIMEOUT_MS = 30000;

const KEYS = ["on", "w1", "m1", "m3", "m6", "m12"];
const TOLERANT = process.argv.includes("--from-archive-ok");
const LENIENT = process.env.EIBOR_LENIENT === "true";
const isNum = (v) => typeof v === "number" && isFinite(v);
const realRow = (r) => KEYS.every((k) => isNum(r[k]));
const dkey = (d) => d.split("/").reverse().join("");
/* Escapes text for a GitHub Actions workflow command (::warning::...) */
const cmdText = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const tried = []; // what each source answered, for the warning/error message

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

/* Returns { body, note }: note says why there is no usable body (HTTP status, timeout...) */
async function tryFetch(label, url, opts) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) { console.error("[eibor]", label, "HTTP", res.status); return { body: "", note: "HTTP " + res.status }; }
    return { body: await res.text(), note: "" };
  } catch (e) {
    const why = e.name === "TimeoutError" ? "timeout after " + FETCH_TIMEOUT_MS / 1000 + "s"
      : e.message + (e.cause && e.cause.code ? " (" + e.cause.code + ")" : "");
    console.error("[eibor]", label, "failed:", why);
    return { body: "", note: why };
  }
}

async function getRows() {
  if (existsSync(LOCAL_HTML)) {
    const rows = parseHtmlRows(readFileSync(LOCAL_HTML, "utf8"));
    console.log("[eibor] pre-fetched fragment ->", rows.length, "rows");
    if (rows.length) return rows;
    tried.push("browser render: 0 rows");
  } else {
    tried.push("browser render: no page saved");
  }
  let r = await tryFetch("direct", URL_DATA, UA);
  let rows = parseHtmlRows(r.body);
  console.log("[eibor] direct ->", rows.length, "rows");
  if (rows.length) return rows;
  tried.push("direct: " + (r.note || "0 rows"));

  r = await tryFetch("jina", URL_JINA, { headers: { "User-Agent": UA.headers["User-Agent"] } });
  rows = parseHtmlRows(r.body);
  if (!rows.length) rows = parseTextRows(r.body);
  console.log("[eibor] jina ->", rows.length, "rows");
  if (!rows.length) tried.push("jina: " + (r.note || "0 rows"));
  return rows;
}

/*
 * Date keys (YYYYMMDD) of the newest fixing the archive should already hold, and of the
 * business day before it. Dubai is UTC+4 with no DST. The CBUAE publishes late morning
 * (the page read "Last updated ... 12:15 PM" on 2026-10-08); until 13:00 Dubai today's
 * fixing is not expected yet. No fixings on Saturday/Sunday. UAE public holidays are not
 * modelled: on those days the CBUAE page still lists earlier rows, so the no-rows branch
 * that uses this is not reached.
 */
function expectedFixing(now = new Date()) {
  const d = new Date(now.getTime() + 4 * 3600e3);
  const key = () => d.toISOString().slice(0, 10).replace(/-/g, "");
  const backToBusinessDay = () => { while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1); };
  if (d.getUTCHours() < 13) d.setUTCDate(d.getUTCDate() - 1);
  backToBusinessDay();
  const latest = key();
  d.setUTCDate(d.getUTCDate() - 1);
  backToBusinessDay();
  return { latest, previous: key() };
}

async function main() {
  const rows = await getRows();

  // Archive: accumulate every real daily fixing (dedupe by date - the rendered
  // page contains the table twice, and old runs polluted the archive with dupes)
  const arch = existsSync(ARCH) ? JSON.parse(readFileSync(ARCH, "utf8")) : { rows: [] };

  if (!rows.length && !TOLERANT) {
    // Nothing fetched on this run. That only matters if the site is now behind the CBUAE.
    const have = arch.rows.filter(realRow).map((r) => r.d).sort((a, b) => dkey(a).localeCompare(dkey(b))).pop() || "";
    const exp = expectedFixing();
    const why = "No rows from the CBUAE on this run (" + tried.join("; ") + ").";
    if (have && dkey(have) >= exp.latest) {
      console.log("::warning title=EIBOR update::" + cmdText(why + " The latest fixing (" + have + ") is already saved, so nothing to do."));
      return;
    }
    if (LENIENT && have && dkey(have) >= exp.previous) {
      console.log("::warning title=EIBOR update::" + cmdText(why + " The site still shows the fixing of " + have + "; a later run today retries."));
      return;
    }
    throw new Error(why + " The site still shows the fixing of " + (have || "(none)") + " and is now out of date (CBUAE layout changed or all sources blocked?).");
  }

  const byDate = {};
  arch.rows.concat(rows).forEach((r) => { if (realRow(r)) byDate[r.d] = r; });
  arch.rows = Object.values(byDate).sort((a, b) => dkey(a.d).localeCompare(dkey(b.d)));

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

main().catch((e) => {
  console.error("[eibor] FAILED:", e.message);
  console.log("::error title=EIBOR update::" + cmdText(e.message));
  process.exit(1);
});
