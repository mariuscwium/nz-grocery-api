# Project Status

## Current: Scraper + Local DB working

**Last updated:** 2026-03-24

### Done
- [x] Price parser — 6 formats, 11 tests
- [x] HTML parser — cheerio, 9 tests against real fixture
- [x] Scraper with DI — Fetcher interface + FetcherTwin, 6 tests
- [x] SQLite DB — schema, upsert, query with filters, 9 tests
- [x] Quality gates — ESLint strict, TypeScript strict, 85% coverage
- [x] First scrape — 469 Canterbury specials from 6 retailers
- [x] Query script — CLI tool for searching the DB

### Next
- [ ] API endpoints (GET /api/specials, /categories, /retailers, /stats)
- [ ] OpenClaw skill to query the API
- [ ] Daily cron (OpenClaw or Vercel)
- [ ] Deploy to Vercel
- [ ] Supabase migration (replace SQLite for production)

### Numbers
- 35 tests, 4 test files
- 95% statement coverage (on measured files)
- 469 specials in local DB
- 6 retailers, 4 categories
- ~50-80 HTTP requests per scrape
