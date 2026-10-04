# Logbench

Static Spanish landing comparing eight vision models on three handwritten flight-logbook photos (37 flights). No build, dependencies, API keys or model calls at runtime.

## Preview

Run `python3 -m http.server 4173 --directory dist` and open http://localhost:4173.

## GitHub Pages

1. Put this directory's contents (`dist/`, `.github/`, README) in a GitHub repository, on `main`.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Push to `main` or run **Publish Logbench to GitHub Pages** manually.

The workflow publishes only `dist/`. All URLs are relative, so repository subpaths work. A separate Sites hosting manifest may exist in the working checkout; it is unnecessary for GitHub Pages and excluded from the distribution ZIP.

## Languages

English is the default. The header selector switches the entire interface to Spanish and remembers the choice locally. Model and filter selections are preserved. Numbers follow the selected locale, with grouping enabled for four-digit values too. `dist/i18n.js` contains the translations; no translation service is called.

## Data and evaluation

- `dist/data.json`: ranking, aggregated counts, costs and tokens.
- `dist/details.json`: per-photo results, anonymous discrepancy descriptions and execution settings. Loaded on demand by the interactive explorer.
- `dist/protocol.json`: exact core prompt, scoring rules, normalization and limitations.

Version 2 evaluates original responses after reference-independent format normalization. It restores values discarded by the old importer (such as `date` instead of `flight_date`) and uses audited row correspondences instead of treating unreadable dates as missing flights. It supersedes v1 metrics.

Score: `100 × correct / (correct + 2 × incorrect + omitted)`. Correct empty cells do not earn points. Missing flights contribute missing required fields. Extra content contributes incorrect fields. Empty/cancellation-only rows are ignored. Quality-price is score divided by total observed cost for the same three photos, not a guarantee of equivalent reliability. Reasoning tokens are a subset of output tokens and are never added twice.

The reference was corrected and validated by the logbook owner. Source arithmetic errors are not OCR errors. Configurations differ in reasoning budget, provider and structured-output support; the study is exploratory and has one run per model and photo. Costs cover selected final responses, not all discarded trials.

Only aggregates and anonymous field/row discrepancy descriptions are public. No photos, names, aircraft registrations, flight records, free-text remarks or credentials are included. Private source data and regeneration scripts are kept outside this repository.
