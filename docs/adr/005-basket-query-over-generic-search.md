# ADR 005: Basket Query Over Generic Search

## Status
Accepted

## Context
The API needs to serve AI agents asking "what's the cheapest milk, bread, and eggs?" A generic GET endpoint with a single `q` param would require multiple calls. A bulk endpoint that accepts a list of items and returns the cheapest match per item in one call is more efficient.

## Decision
POST /api/specials accepts `{ items: ["milk", "bread", "eggs"], retailerIds?, memberRetailerIds?, region? }`. Returns a map of search term → cheapest matching special or `null`. One DB query per item (limit 1), results keyed by the original search term.

Member pricing is excluded by default. Callers pass `memberRetailerIds` to opt-in to member deals for specific retailers — a user with a Pak'nSave card sees those deals without seeing New World member pricing they can't access.

## Consequences
- Single HTTP call for a full shopping list (up to 20 items)
- Response shape is `{ results: { "milk": {...} | null }, meta: { region, queriedAt } }`
- Validation rejects empty items, empty strings, and arrays over 20
- Handler logic is simple: loop over items, query each, serialize
- No pagination needed (one result per item)
- Future: smart substitutions ("no olive oil, try peanut oil") can be added per-item without changing the response shape
