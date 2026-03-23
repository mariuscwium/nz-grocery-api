# CLAUDE.md

## What this project is

REST API for NZ grocery specials. Scrapes SaleFinder.co.nz daily, stores structured price data in SQLite (local dev) or Supabase (production), exposes query endpoints for AI agents.

Canterbury region. Cost-of-living items only (groceries, beverages, home essentials, healthcare).

## Stack

- TypeScript (strict, ES2022, ESM)
- cheerio for HTML parsing
- better-sqlite3 for local DB
- Vitest for tests
- Vercel for deployment (planned)

## Project structure

```
src/
  scraper/
    fetch.ts      — production HTTP fetcher (Fetcher interface)
    parse.ts      — cheerio HTML parsing
    prices.ts     — price format parsing (6 formats)
    run.ts        — scraper entry point, wires deps
  lib/
    db.ts         — SQLite schema, upsert, query
    deps.ts       — Fetcher + Output interfaces (DI)
    types.ts      — Special, Category types + CATEGORIES constant
  api/            — (planned) REST endpoints
twins/
  fetcher.ts      — in-memory HTTP double
  output.ts       — captures stdout
tests/
  prices.test.ts  — 11 tests for price parsing
  parse.test.ts   — 9 tests against real HTML fixture
  scraper.test.ts — 6 tests for scrape flow using twins
  db.test.ts      — 9 tests for SQLite upsert + query
  fixtures/
    groceries-page1.html — saved real page for deterministic tests
scripts/
  query.ts        — CLI query tool: npx tsx scripts/query.ts [search]
```

## Quality gates (ship-kit)

- ESLint: complexity 10, file size 200 lines, no-any, no-console
- TypeScript: strict, noUnusedLocals, noUncheckedIndexedAccess
- Vitest: 85% statements, 70% branches, 85% functions/lines
- Pre-push hook runs `npm run quality`

## Key patterns

- **Dependency injection** via Fetcher/Output interfaces in `deps.ts`. Production code receives deps as parameters. Tests inject twins.
- **Digital twins** in `twins/` — FetcherTwin returns saved HTML, no network calls in tests.
- **Price parsing** handles: simple ($4.50), savings (Save $1.00), multi-buy (2 for $7.00), per-unit ($4.00 each), member pricing, pack pricing.
- **Upsert on conflict** — same item + sale + region deduplicates on re-scrape.

## Commands

```bash
npm run quality          # typecheck + lint + test with coverage
npm run scrape           # scrape live site into specials.db
npx tsx scripts/query.ts # query DB (optional search term arg)
```

## Data source

- SaleFinder.co.nz category pages
- Region via `Cookie: regionName=Canterbury`
- Pagination via `?qs=N,,,,`
- 4 categories: groceries (c-191), beverages (c-190), home essentials (c-168), healthcare (c-129)
- ~470 specials per scrape, 6 retailers

## Current status

Scraper and local DB working. API endpoints and deployment are next.

## Conventions

- Prices stored as cents (integers). $4.50 = 450.
- 1 second delay between page fetches (be respectful to SaleFinder)
- Production HTTP clients excluded from coverage (tested via twins)
- Scripts excluded from coverage
