# ADR 004: FTS5 Over LIKE for Product Search

## Status
Accepted

## Context
The specials basket query searches products by name. LIKE `%butter%` matches any product containing "butter" as a substring, treating "Anchor Butter 500g" and "Fireball Peanut Butter Whisky" as equal matches. The cheapest substring match wins, which returns irrelevant products. Vector/semantic search was considered but rejected as overkill for ~470 products.

## Decision
Use SQLite FTS5 (full-text search) with BM25 ranking. An `specials_fts` virtual table mirrors `product_name` via content-sync triggers (INSERT/UPDATE/DELETE). When `q` is provided, `querySpecials` joins against the FTS table with `MATCH` and orders by `rank` (relevance) then `sale_price_cents` (price). Without `q`, the query skips FTS entirely.

## Consequences
- "butter" now ranks "Anchor Butter 500g" above "Peanut Butter Whisky" because BM25 scores shorter documents with the same term higher
- Prefix matching via `"term"*` syntax (e.g., "milk" matches "milkshake")
- Triggers keep FTS in sync automatically — no manual rebuild needed after upserts
- `rebuildFts()` exists for one-time migration of existing data
- FTS5 is built into SQLite, no new dependencies
- Future: if semantic search is needed ("snacks" → "Doritos"), vector search can be layered on top
