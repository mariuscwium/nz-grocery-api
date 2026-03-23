# ADR 003: Price Parsing Strategy

## Status
Accepted

## Context
SaleFinder prices appear in at least 6 formats inside `.price-options` elements: simple ($4.50), savings (Save $1.00), multi-buy (2 for $7.00), per-unit ($4.00 each), member pricing, and pack pricing. Some items combine multiple formats in a single block.

## Decision
Parse prices with a pipeline of small functions, each handling one format. Run all parsers against the text. Store all extracted values (sale price, multi-buy, savings, member flag) rather than trying to normalize to a single price. Store prices as integer cents to avoid floating point issues.

## Consequences
- Each price format has dedicated regex patterns, individually testable
- SonarJS slow-regex rule caught a backtracking vulnerability in the multi-buy regex — fixed by splitting into two simpler patterns
- Complexity stayed under the ESLint limit (10) by extracting each parser into its own function
- 11 price tests cover known formats. New formats from SaleFinder will need new tests.
