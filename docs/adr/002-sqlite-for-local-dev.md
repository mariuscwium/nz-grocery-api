# ADR 002: SQLite for Local Dev

## Status
Accepted (temporary — migrate to Supabase for production)

## Context
The scraper needs persistent storage. Supabase is the production target, but spinning up a local Supabase instance adds friction during development.

## Decision
Use better-sqlite3 for local development. Same schema shape as the planned Supabase Postgres schema. The query interface (`querySpecials`) abstracts the DB, so swapping SQLite for Supabase means changing the client, not the callers.

## Consequences
- Zero setup for local dev (no Docker, no Supabase CLI)
- WAL mode gives safe concurrent reads
- Upsert syntax (`ON CONFLICT ... DO UPDATE`) works in both SQLite and Postgres
- Migration path: replace `better-sqlite3` calls with `@supabase/supabase-js`, keep the same table structure
