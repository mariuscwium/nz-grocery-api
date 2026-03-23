# New World Category Research

## JSON API (Next.js _next/data)

Shop pages return 403 (Cloudflare challenge), but the Next.js data endpoints are accessible with a browser UA.

**Endpoint pattern:**
```
https://www.newworld.co.nz/_next/data/{BUILD_ID}/en/shop/category/{slug}.json?pg={page}&categories={slug}
```

**Build ID:** Changes on each deploy. Discover from:
```
curl -s "https://www.newworld.co.nz/_next/buildManifest.js" | grep -o 'buildId":"[^"]*'
```

**Headers required:**
- `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`

**Product data location:** `pageProps.serverState.initialResults.popularity-si.results[0].hits`

**Product shape:**
```json
{
  "productId": "5045858-EA-000",
  "name": "Sweetcorn",
  "displayName": "ea",
  "saleType": "UNITS",
  "originStatement": "Product of New Zealand",
  "singlePrice": { "price": 119, "comparativePrice": { "pricePerUnit": 119, "unitQuantityUom": "ea" } },
  "promotions": [{ "rewardValue": 99, "rewardType": "NEW_PRICE", "cardDependencyFlag": true }],
  "categoryTrees": [{ "level0": "Fruit & Vegetables", "level1": "Vegetables", "level2": "Beans, Corn & Asparagus" }]
}
```

Prices in cents. 50 products per page. Pagination: `nbHits`, `nbPages` in response.

**Fulfillment/store endpoint:**
```
https://www.newworld.co.nz/_next/data/{BUILD_ID}/en/shop/fulfillment.json
```
Returns 149 stores. Prices may be store-specific — needs investigation.

## Confirmed categories (from user + API probing)

| # | Slug | Products | Pages |
|---|------|----------|-------|
| 1 | fruit-and-vegetables | 249 | 5 |
| 2 | bakery | 406 | 9 |
| 3 | fridge-deli-and-eggs | 1000 | 20 |
| 4 | frozen | 808 | 17 |
| 5 | pantry | 1000+ | 20 |
| 6 | hot-and-cold-drinks | 1000 | — |
| 7 | beer-wine-and-cider | 1000 | — |
| 8 | health-and-body | 1000 | — |
| 9 | household-and-cleaning | 1000 | — |
| 10 | baby-and-toddler | 342 | — |
| 11 | meat-poultry-and-seafood | 417 | 9 |

**Not found (404):** snacks-and-confectionery, pet-food, international-foods

**Awaiting from user:** remaining category slugs (snacks, pet, etc.) — user to provide URLs as discovered

## Notes

- Algolia-powered search behind the scenes
- `cardDependencyFlag: true` on promotions = Clubcard member price
- Product facets include: Non-GMO, Dairy Free, Organic, Gluten Free, Low Fat
