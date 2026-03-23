# ADR 001: Digital Twins Over Mocks

## Status
Accepted

## Context
The scraper makes HTTP requests to SaleFinder. Tests that hit the real site are slow, flaky, and rude (rate limiting). vi.mock() would hide the HTTP interface and miss real integration bugs.

## Decision
Define a `Fetcher` interface. Production code calls `deps.fetcher.fetch()`. Tests inject `FetcherTwin`, which returns saved HTML from memory. The twin records all calls for assertions.

## Consequences
- Tests run in <2 seconds with no network calls
- FetcherTwin enforces the same interface as the production fetcher
- Saved HTML fixture (`tests/fixtures/groceries-page1.html`) gives deterministic parsing tests
- Adding a new data source means adding a new twin, not more mocks
