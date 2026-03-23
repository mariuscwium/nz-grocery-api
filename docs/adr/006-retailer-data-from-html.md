# ADR 006: Retailer Metadata From HTML Scraping

## Status
Accepted

## Context
The `retailers` table existed in the schema but was never populated. The API returned only retailer IDs (derived from `SELECT DISTINCT retailer_id FROM specials`), making them meaningless to consumers. SaleFinder HTML contains retailer name (logo `alt` attribute) and slug (catalogue href).

## Decision
Extract retailer name and slug during scraping via `parseRetailers()`. Deduplicate by ID per page. Upsert into the `retailers` table alongside specials on each scrape run. The API endpoint queries the `retailers` table directly.

## Consequences
- GET /api/retailers returns `{ id, name, slug }` instead of just `{ id }`
- Retailer data stays fresh — re-scraped and upserted on every run
- Slug derived from catalogue href (e.g., `/Crackerjack-catalogue` → `crackerjack`)
- `scrapeCategory` and `scrapeAll` now return `ScrapeResult { specials, retailers }` instead of `Special[]`
- Existing scraper tests updated to use the new return shape
