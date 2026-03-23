# API Endpoints Design

## Endpoints

### GET /api/retailers

Returns distinct retailers from the specials table (the `retailers` table is unpopulated — derive from scraped data).

**Query:** `SELECT DISTINCT retailer_id as id FROM specials`

Note: retailer names/slugs are not currently scraped. This endpoint returns IDs only until the scraper is extended to capture retailer metadata.

**Response:**
```json
{
  "retailers": [
    { "id": 1 },
    { "id": 2 }
  ]
}
```

### POST /api/specials

Basket query — accepts multiple search terms, returns the single cheapest match per item.

**Request body:**
```json
{
  "items": ["milk", "bread", "eggs", "flour"],
  "retailerIds": [1, 3],
  "memberRetailerIds": [1],
  "region": "Canterbury"
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| items | yes | — | Array of search terms (max 20) |
| retailerIds | no | all | Filter to these stores |
| memberRetailerIds | no | none | Include member-only deals for these retailers |
| region | no | "Canterbury" | Region filter |

**Member pricing logic:**
- Rows where `member_price = 1` are excluded by default
- If `memberRetailerIds` is provided, member deals are included only for those retailer IDs
- Non-member deals are always included regardless

**Query strategy:**
- The API handler loops over `items` and calls `querySpecials` once per search term with `limit: 1`
- `querySpecials` `QueryParams` is extended: `retailerId` (singular) becomes `retailerIds: number[]`, add `memberRetailerIds: number[]`
- Items with NULL `sale_price_cents` are excluded (WHERE clause: `sale_price_cents IS NOT NULL`)
- Existing `scripts/query.ts` caller updated for the `retailerIds` change

**Response:**

Each key in `results` maps to the cheapest matching special, or `null` if no current special was found.

```json
{
  "results": {
    "milk": {
      "id": 42,
      "productName": "Anchor Blue Milk 2L",
      "description": "Limit 2 per customer",
      "salePriceCents": 399,
      "originalPriceCents": 549,
      "savingsCents": 150,
      "multiBuyQty": null,
      "multiBuyPriceCents": null,
      "unitPriceText": "$2.00/L",
      "memberPrice": false,
      "buyUrl": "https://...",
      "retailerId": 1,
      "categoryId": 191,
      "region": "Canterbury",
      "scrapedAt": "2025-03-24T00:00:00Z"
    },
    "bread": {
      "id": 87,
      "productName": "Nature's Fresh Toast White",
      "salePriceCents": 250,
      "..."
    },
    "eggs": null,
    "flour": null
  },
  "meta": {
    "region": "Canterbury",
    "queriedAt": "2025-03-24T12:00:00Z"
  }
}
```

Response uses camelCase. `memberPrice` mapped from DB integer (0/1) to boolean. `scrapedAt` appends `Z` (DB stores UTC without suffix).

**Error responses:**
- 400 if `items` is missing, empty, or not an array
- 200 for success (empty results are valid)

## Implementation

- Vercel serverless functions in root `api/` directory
- `api/retailers.ts` — queries distinct retailer IDs from specials table
- `api/specials.ts` — validates input, loops over items, calls `querySpecials` per item
- Extend `QueryParams` in `src/lib/db.ts`: replace `retailerId` with `retailerIds`, add `memberRetailerIds`, add `sale_price_cents IS NOT NULL` condition
- Update `scripts/query.ts` for the `retailerIds` change
- Input validation at the API boundary

## Future

- `GET /api/regions` — list available regions
- Extend scraper to capture retailer name/slug for richer `/api/retailers` response
