# eibor-rate-today

Bundle for the "EIBOR rate today" page on brokermatch.ae (/eibor-rate-today), mirroring the LF euribor-hoje setup.

## Setup (once)

1. Create the GitHub repo `pedrofintech/eibor-rate-today` (public), branch `main`. If you use another account/repo name, update the two jsDelivr URLs: in the Webflow embed (script src) and inside `eibor.js` (DATA_URL).
2. Push `eibor.js` and `eibor-data.json` to the repo root.
3. The Webflow embed already points to `https://cdn.jsdelivr.net/gh/pedrofintech/eibor-rate-today@main/eibor.js`.

## Updating rates (daily)

Edit `eibor-data.json` only - never the Webflow page:

- `referenceDate`: date of the latest CBUAE fixing (DD/MM/YYYY).
- `series`: daily fixings, oldest first (keys: on, w1, m1, m3, m6, m12). Keep up to 30 rows; minimum 2 (the change column compares the last two rows).
- `history`: monthly averages (d: YYYY-MM), oldest first, 12 rows - feeds the 1-year chart.
- Values must be numbers (e.g. `4.312`), not strings. `"X.XX"` placeholders render literally on the page.

Source: https://www.centralbank.ae/en/forex-eibor/eibor-rates/ (published every UAE business day). jsDelivr caches @main for ~12h; to force a refresh, purge via https://www.jsdelivr.com/tools/purge or pin a tag.
