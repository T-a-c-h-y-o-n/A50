# A50 Scan

AI Act Article 50 transparency scanner: submit a site URL, get a deterministic,
evidence-backed gap report as a one-page PDF. Sourced checklist, not legal advice.

Live site: **https://a50.ai2eo.com**

## What is here

```
a50/                 deterministic scan engine (no LLM)
  config.py          env-based settings
  models.py          ScanResult / Finding / Evidence (output contract)
  legal.py           verified legal claims (VERIFICATION GATE)
  signatures/        versioned vendor signature DB + validator + staleness
  fetch/             SSRF-safe HTTP, robots.txt, artifact+sha256
  parse/             DOM extraction (visible/hidden text) + media provenance
  disclosure.py      multilingual AI disclosure detection
  rules/             A50-01..A50-08 pure rule functions
  engine.py          crawl + orchestration -> ScanResult
  storage/           SQLite (scans, pages, findings, subscribers, checkouts)
  reports/           single-page HTML + PDF (from ScanResult only)
app/                 FastAPI: /api/v1/scan, /interest, /checkout, /stripe/webhook
web/                 static landing + result page
scan.py              CLI
tests/               fixture test matrix a-h + API tests
```

## Notes

- The scan form works with or without the backend API. When the API is
  unreachable, requests are queued via Formspree and answered by email.
  Nothing is lost.
- Every legal claim carries a verified source URL and lastReviewed date.
  Unverifiable claims are excluded from the report body.
- The signature database is versioned and dated. Adding a vendor touches
  only the data file, never the rule code.
- This is a sourced checklist, not legal advice.

Contact: info@ai2eo.com
