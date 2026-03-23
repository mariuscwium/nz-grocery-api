# API Endpoints Design

## Endpoints

### GET /api/retailers

Returns all retailers from the database.

**Response:**
```json
{
  "retailers": [
    { "id": 1, "name": "Pak'nSave", "slug": "paknsave" }
  ]
}
```

### POST /api/specials

Basket query — accepts multiple search terms, returns cheapest matches per item.

**Request body:**
```json
{
  "items": ["milk", "bread", "eggs"],
  "retailerIds": [1, 3],
  "memberRetailerIds": [1],
  "region": "Canterbury",
  "limit": 5
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| items | yes | — | Array of search terms |
| retailerIds | no | all | Filter to these stores |
| memberRetailerIds | no | none | Include member-only deals for these retailers |
| region | no | "Canterbury" | Region filter |
| limit | no | 5 | Max results per item |

**Member pricing logic:**
- Rows where `member_price = 1` are excluded by default
- If `memberRetailerIds` is provided, member deals are included only for those retailer IDs
- Non-member deals are always included regardless

**Response:**
```json
{
  "results": {
    "milk": [
      {
        "id": 42,
        "productName": "Anchor Blue Milk 2L",
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
        "scrapedAt": "2025-03-24T00:00:00"
      }
    ]
  },
  "meta": {
    "region": "Canterbury",
    "queriedAt": "2025-03-24T12:00:00Z"
  }
}
```

Response uses camelCase. Results ordered cheapest first per item.

**Error responses:**
- 400 if `items` is missing or empty
- 400 if `items` is not an array
- 200 for success (empty results are valid)

## Implementation

- Vercel serverless functions in root `api/` directory
- `api/retailers.ts` — queries retailers table
- `api/specials.ts` — validates input, queries per item with member pricing filter
- Extend `querySpecials` in `src/lib/db.ts` to support `memberRetailerIds` parameter
- Input validation at the API boundary

## Future

- `GET /api/regions` — list available regions
