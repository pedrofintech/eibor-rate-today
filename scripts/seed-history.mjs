/*
 * One-time backfill: downloads the CBUAE yearly EIBOR workbooks (2025 + 2026)
 * and seeds eibor-archive.json with the daily fixings, so the 1-year chart has
 * monthly averages from day one. Run via the "Seed EIBOR history" workflow,
 * which installs the xlsx package first. Safe to re-run (dedupes by date).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSX from "xlsx";

const FILES = [
  "https://www.centralbank.ae/media/wk5phybn/eibor_2025.xlsx",
  "https://www.centralbank.ae/media/an0hfukx/eibor_2026.xlsx"
];
const ARCH = new URL("../eibor-archive.json", import.meta.url);
const UA = { headers: { "User-Agent": "Mozilla/5.0 (BrokerMatch EIBOR bot; +https://brokermatch.ae)" } };

const COLS = {
  on:  ["o/n", "on", "overnight"],
  w1:  ["1 week", "1w", "one week"],
  m1:  ["1 month", "1m", "one month"],
  m3:  ["3 month", "3m", "three month"],
  m6:  ["6 month", "6m", "six month"],
  m12: ["1 year", "12 month", "12m", "1y", "one year"]
};

function colKey(h) {
  const s = String(h == null ? "" : h).toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s === "date" || s.startsWith("fixing")) return "date";
  for (const k of Object.keys(COLS)) if (COLS[k].some((a) => s === a || s.startsWith(a))) return k;
  return null;
}

function toDate(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? new Date(d.y, d.m - 1, d.d) : null; }
  const t = Date.parse(String(v)); return isNaN(t) ? null : new Date(t);
}
const pad = (n) => String(n).padStart(2, "0");

async function main() {
  const arch = existsSync(ARCH) ? JSON.parse(readFileSync(ARCH, "utf8")) : { rows: [] };
  const have = new Set(arch.rows.map((r) => r.d));
  let added = 0;

  for (const url of FILES) {
    const r = await fetch(url, UA);
    if (!r.ok) { console.error("[seed] skip", url, "HTTP", r.status); continue; }
    const wb = XLSX.read(Buffer.from(await r.arrayBuffer()), { cellDates: false });
    for (const name of wb.SheetNames) {
      const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true });
      let map = null;
      for (const row of grid) {
        if (!Array.isArray(row) || !row.length) continue;
        const keys = row.map(colKey);
        if (keys.filter((k) => k && k !== "date").length >= 5) {
          map = { date: keys.indexOf("date") >= 0 ? keys.indexOf("date") : 0 };
          keys.forEach((k, i) => { if (k && k !== "date" && !(k in map)) map[k] = i; });
          continue;
        }
        if (!map) continue;
        const date = toDate(row[map.date]);
        if (!date) continue;
        const rec = { d: pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" + date.getFullYear() };
        let ok = true;
        for (const k of Object.keys(COLS)) {
          const v = parseFloat(row[map[k]]);
          if (!isFinite(v)) { ok = false; break; }
          rec[k] = v;
        }
        if (ok && !have.has(rec.d)) { arch.rows.push(rec); have.add(rec.d); added++; }
      }
      if (!map) console.log("[seed] no header found in sheet:", name, "| first row:", JSON.stringify((grid[0] || []).slice(0, 10)));
    }
  }

  arch.rows.sort((a, b) => a.d.split("/").reverse().join("").localeCompare(b.d.split("/").reverse().join("")));
  writeFileSync(ARCH, JSON.stringify(arch) + "\n");
  console.log("[seed] added", added, "days | archive total", arch.rows.length);
  if (!arch.rows.length) process.exit(1);
}

main().catch((e) => { console.error("[seed] FAILED:", e.message); process.exit(1); });
