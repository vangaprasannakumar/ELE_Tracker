# ELE Tracker

A production-tracking app for the **Winding → Final QA** capacitor batch card — the 9-stage physical card used on the shop floor, digitized. Every batch is tracked under one `MasterBatchNo` as it moves through each stage, from element winding to final QA sign-off.

This is a sibling app to CALGAS CAPACITORS' **Stock Management** app, not a replacement for the broader Manufacturing Tracker (order-to-dispatch) project — ELE Tracker's scope is specifically the physical Winding-to-FQA batch card.

## Architecture

- **Database:** Google Sheets
- **Backend:** Google Apps Script, single file (`Code.gs`), deployed as a Web App
- **Frontend:** single-file `index.html`, hosted on GitHub Pages, installable as a PWA
- **Auth:** none of its own — every request is validated against **Stock Management's** `Sessions` sheet directly. Sign in once with your Stock Management account; ELE Tracker recognizes it.

```
Browser (index.html)
   │  POST { action, token, ...params }
   ▼
Apps Script Web App (Code.gs)
   │  reads/writes
   ▼
Google Sheet (this app's own spreadsheet)
   │  session lookup only
   ▼
Stock Management's Sheet (Sessions, Users, FG_Master)
```

## The 9 stages

| # | Stage | Sheet tab |
|---|-------|-----------|
| 1 | Winding | `Winding` |
| 2 | Spray & Core Cleaning | `PaperMaskingSpray` |
| 3 | Heat Stabilization | `HeatStabilization` |
| 4 | Short Clearing (+ testing rounds) | `ShortClearing`, `ShortClearing_Testing` |
| 5 | Welding / Lead Soldering | `Welding` |
| 6 | Pouring & Curing | `PouringCuring` |
| 7 | Electrical Testing & Packing | `PouringElectricalPacking` |
| 8 | BDV & Final Testing | `BDVFinalTesting` |
| 9 | Final QA | `FinalQA_Results` |

Every stage after Winding requires the batch to currently be sitting at the stage immediately before it — the app enforces the card's fixed order. Final QA submission also flips the batch's `Status` to `Complete`.

## Setup (fresh install)

1. Create a new Google Sheet.
2. **Extensions → Apps Script**, delete the boilerplate, paste in `Code.gs`.
3. Run `ADMIN_setupSheet()` once from the Apps Script editor. This creates every tab the app needs, with headers — safe to re-run later, it only creates tabs that don't already exist.
4. **Deploy → New deployment → Web app** (execute as yourself, access: Anyone). Copy the deployment URL.
5. In `index.html`, set `ELE_API_URL` to that URL, and confirm `STOCK_API_URL` points at your existing Stock Management deployment.
6. Fill in the **Dropdowns** tab (see below) — machines, shifts, and the per-stage operator lists.
7. Host `index.html` (plus `manifest.json` and `sw.js` for PWA install support — not included in this repo) on GitHub Pages or similar static hosting.

### Dropdowns tab — columns to populate

Each column header names a list; put one value per row underneath.

**Machines:** `Machines_Winding`, `Machines_Spray`, `Machines_HeatStab`, `Machines_ShortClearing`, `Machines_Welding`, `Machines_PouringCuring`, `Machines_ElectricalPacking`, `Machines_BDV`

**Operators — one list per stage** (each stage has its own people, not a shared list):
`Operators_Winding`, `Operators_Spray`, `Operators_HeatStab`, `Operators_ShortClearing`, `Operators_Welding`, `Operators_PouringCuring`, `Operators_ElectricalPacking`, `Operators_BDV`, `Operators_FinalQA`

**Everything else:** `Shifts`, `FilmType`, `FreeMargin`, `Resistivity`, `CanSize`, `AssemblyDeltaWireType`, `MetalTopConnection`, `ProcessTimeOptions` (e.g. 12/10/8/6 Hrs), `CoolingTimeOptions` (e.g. 4/3/2 Hrs), `FilmUsedFor`, `FilmSupplier`, `FilmTypeShortCode`, `CustomerNames`

> If you're updating an existing sheet rather than starting fresh, add these columns by hand — `ADMIN_setupSheet()` only creates tabs that don't exist yet, it won't add new columns to a tab you already have.

### If upgrading an existing ShortClearing tab

Add four columns for the card's separate "Retesting (If Required)" block: `RetestClearingVoltageDC`, `RetestClearingVoltageAC`, `RetestReactorBalancingMFD`, `RetestOperatorName`.

## Features

- **Full batch lifecycle** — create a batch at Winding (auto-generates `MasterBatchNo` as `{Machine}_{MFD}_{DD/MM/YYYY}_{FY serial}`), log each stage in order through to Final QA.
- **Dashboard** — every batch, live stage/status, search by FG code / master batch no / date.
- **Batch report** — click any batch row for a one-screen summary of everything logged across all 9 stages, without hunting through each stage's table.
- **Export, everywhere** — every stage table and the Dashboard has an Export button. Downloads a styled `.xlsx` (colored header, zebra rows, green highlight for `Complete` batches) via the `xlsx-js-style` library (CDN), falling back to plain `.csv` automatically if that CDN isn't reachable.
- **Export picker** — every Export button opens an Excel-filter-style checkbox list (search + select-all, default: everything selected) so you can export a subset of batches instead of the whole table.
- **Full batch report export** — one click from the batch report modal downloads a multi-sheet workbook, one tab per stage, every column, for a single batch.
- **Dark / light theme**, persisted, defaults to system preference.
- **Mobile-first navigation** — one stage visible at a time (not a long scroll), with a fixed bottom icon tab bar on mobile and a top bar on desktop. Last-viewed stage is remembered across reloads.
- **Animated splash screen** with staged loading progress on boot and sign-in.
- Per-stage operator dropdowns (each stage has its own people list, not a shared one).

## File structure

```
Code.gs        Apps Script backend — single file, sectioned:
                 CONFIG → UTILS → AUTH → CODEGEN → STAGE HELPERS →
                 PHASE 1–5 (stage handlers) → API ROUTING → SETUP
index.html     Frontend — single file, PWA
manifest.json  PWA manifest (not authored here — bring your own)
sw.js          Service worker (not authored here — bring your own)
```

## Known limitations / open items

- **QR/barcode batch scanning** — considered and explicitly descoped, not planned.
- **Mobile modernization is in progress.** Phase 1 (tab-based navigation) is done. Not yet built: copy-last-shift quick-fill, an offline submission queue, a stale-batch flag on the Dashboard, a connection-status indicator, skeleton loading states, pull-to-refresh, haptic feedback, bottom-sheet modals on mobile, and an install-to-home-screen prompt.
- **Final QA's test grid was inferred from the physical card**, not fully confirmed: it assumes 4 sample columns and splits each "Cap./Tand" row into two separate rows (Cap, then Tand) rather than one cell holding two values. Both are easy one-line changes (`FQ_SAMPLE_IDS`, `FQ_TEST_ROWS` in `index.html`) if the real card differs.
- **Short Clearing's retest sub-block** (separate DC/AC/Reactor/Operator fields under "Retesting (If Required)") was likewise inferred from the card and may need adjustment.
- **Export styling depends on a CDN** (`xlsx-js-style` via jsDelivr) — if a deployment environment can't reach it, exports silently fall back to unstyled CSV rather than failing.
- No automated tests — verification during development has been manual (syntax checks, DOM-mocked logic tests, and structural review against the physical batch card).
