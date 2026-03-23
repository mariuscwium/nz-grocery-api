# NZ Grocery Specials API

Scrapes grocery specials from SaleFinder.co.nz, stores them in Supabase, and exposes REST endpoints for AI agents to query.

Canterbury region. Cost-of-living items only.

## Categories scraped

- Groceries (food staples, pantry items)
- Beverages
- Home Essentials (cleaning, laundry, household)
- Healthcare & Medications

## How it works

A TypeScript scraper fetches SaleFinder category pages with a region cookie, parses the HTML with cheerio, and extracts product name, price, savings, retailer, and buy link. Runs daily. Stores results in Supabase Postgres.

The API lets you search by keyword, filter by category or retailer, sort by price or savings.

## Stack

TypeScript, cheerio, Supabase (Postgres + Auth + Storage), Vercel.

## Quality

26 tests. 94% statement coverage. ESLint strict (complexity 10, file size 200 lines). TypeScript strict. Pre-push hook runs all checks.

Price parsing is tested against 6 formats: simple (`$4.50`), savings (`Save $1.00`), multi-buy (`2 for $7.00`), per-unit (`$4.00 each`), member pricing, and pack pricing. HTML parsing tests run against a saved fixture from the real site.

Scraper tests use a fetcher twin (in-memory HTTP double) so tests run without network calls.

## Development

```bash
npm install
npm run quality    # typecheck + lint + test with coverage
npm run scrape     # run the scraper (outputs JSON to stdout)
```

## API (coming soon)

```
GET /api/specials?q=butter&max_price=5.00&sort=price_asc
GET /api/specials/categories
GET /api/specials/retailers
GET /api/specials/stats
```

## License

MIT
