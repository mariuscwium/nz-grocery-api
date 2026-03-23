# NZ Grocery Specials API

Scrapes grocery specials from SaleFinder.co.nz, stores them in SQLite (local) or Supabase (production), and exposes REST endpoints for AI agents to query.

Canterbury region. Cost-of-living items only.

## Categories scraped

- Groceries (food staples, pantry items)
- Beverages
- Home Essentials (cleaning, laundry, household)
- Healthcare & Medications

## How it works

A TypeScript scraper fetches SaleFinder category pages with a region cookie, parses the HTML with cheerio, and extracts product name, price, savings, retailer, and buy link. Stores results in SQLite with FTS5 full-text search for relevance-ranked queries.

## API

### POST /api/specials

Basket query — send a shopping list, get the cheapest special for each item.

```bash
curl -X POST http://localhost:3000/api/specials \
  -H "Content-Type: application/json" \
  -d '{
    "items": ["milk", "bread", "eggs"],
    "retailerIds": [1, 3],
    "memberRetailerIds": [1],
    "region": "Canterbury"
  }'
```

Returns:
```json
{
  "results": {
    "milk": { "productName": "Trim Milk 2L", "salePriceCents": 399, "..." },
    "bread": null,
    "eggs": { "productName": "Free Range Eggs 12pk", "salePriceCents": 599, "..." }
  },
  "meta": { "region": "Canterbury", "queriedAt": "2026-03-24T12:00:00Z" }
}
```

- `items` — required, up to 20 search terms
- `retailerIds` — optional, filter to specific stores
- `memberRetailerIds` — optional, include member-only deals for these retailers
- `region` — optional, defaults to "Canterbury"

### GET /api/retailers

Returns available retailers with id, name, and slug.

## Stack

TypeScript, cheerio, better-sqlite3 (FTS5), Vitest, Vercel.

## Quality

62 tests. 88% statement coverage. ESLint strict (complexity 10, file size 200 lines). TypeScript strict. Pre-push hook runs all checks.

## Development

```bash
npm install
npm run quality    # typecheck + lint + test with coverage
npm run scrape     # scrape live site into specials.db
npx tsx scripts/query.ts [search]  # query the local DB
```

## License

MIT
