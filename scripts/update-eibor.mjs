/*
 * Updates eibor-data.json from the CBUAE EIBOR endpoint (current-month fixings).
 * Runs on GitHub Actions (Node 20+, native fetch, no dependencies) - same
 * pattern as the LF euribor-hoje bot.
 * Also maintains eibor-archive.json (every daily fixing collected so far) and
 * recomputes the monthly averages ("history") that feed the 1-year chart.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const URL_DATA = "https://www.centralbank.ae/umbraco/Surface/Eibor/GetEiborData";
const DATA = new URL("../eibor-data.json", import.meta.url);
const ARCH = new URL("../eibor-archive.json", import.meta.url);
const MONTHS = { January:"01", February:"02", March:"03", April:"04", May:"05", June:"06", July:"07", August:"08", September:"09", October:"10", November:"11", December:"12" };
const UA = { headers: {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "text/html, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.centralbank.ae/en/forex-eibor/eibor-rates/",
  "X-Requested-With": "XMLHttpRequest"
} };
const LOCAL_HTML = new URL("../eibor-fragment.html", import.meta.url); // optional: pre-fetched by the workflow (curl fallback)

const KEYS = ["on", "w1", "m1", "m3", "m6", "m12"];
const isNum = (v) => typeof v === "number" && isFinite(v);
const realRow = (r) => KEYS.every((k) => isNum(r[k]));
const dkey = (d) => d.split("/").reverse().join("");

const TOLERANT = process.argv.includes("--from-archive-ok"); // seed mode: rebuild from archive even if the live fetch fails

async function main() {
  let html = "";
  try {
    if (existsSync(LOCAL_HTML)) {
      html = readFileSync(LOCAL_HTML, "utf8"); // pre-fetched by the workflow (curl-impersonate)
      console.log("[eibor] using pre-fetched fragment,", html.length, "bytes");
    } else {
      const res = await fetch(URL_DATA, UA);
      if (!res.ok) throw new Error("HTTP " + res.status);
      html = await res.text();
    }
  } catch (e) {
    if (!TOLERANT) throw e;
    console.error("[eibor] live fetch failed (" + e.message + "); rebuilding from archive only");
  }

  // Row shape: <tr> <td>10 July 2026</td> <td>on</td><td>w1</td><td>m1</td><td>m3</td><td>m6</td><td>m12</td> <td>value date</td> </tr>
  const rows = [];
  const re = /<tr>\s*<td[^>]*>\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*<\/td>((?:\s*<td[^>]*>\s*[\d.]+\s*<\/td>){6})/g;
  let m;
  while ((m = re.exec(html))) {
    const mm = MONTHS[m[2]];
    if (!mm) continue;
    const vals = [...m[4].matchAll(/>\s*([\d.]+)\s*</g)].map((x) => parseFloat(x[1]));
    if (vals.length !== 6 || vals.some((v) => !isFinite(v))) continue;
    const rec = { d: m[1].padStart(2, "0") + "/" + mm + "/" + m[3] };
    KEYS.forEach((k, i) => (rec[k] = vals[i]));
    rows.push(rec);
  }
  if (!rows.length && !TOLERANT) throw new Error("No daily rows parsed (CBUAE layout changed or endpoint blocked?)");

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
