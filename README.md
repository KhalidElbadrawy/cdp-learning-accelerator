# CDP Learning Accelerator Demo

A browser-only app that walks a platform initiative through the CDP Learning Framework:
Define → Design → Assess, ending with an Initiative Design Document for the vendor.

## Structure
- `js/`, `css/`, `assets/`: source modules
- `dev.html`: loads the modules directly (serve over HTTP)
- `index.html`: single self-contained build (`node tools/build.mjs`)
- `tests/`: unit tests (`node --test tests/`) and an end-to-end run (`node tests/e2e.cjs`, needs Playwright)

## Run locally
```
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start      # http://localhost:3000
```

## Rafeeq (AI assistant)
`server.mjs` serves the app and calls the Anthropic API (Claude Opus 5.5) for Rafeeq.
The API key stays on the server; the browser only talks to `/api/rafeeq/*`.
- `ANTHROPIC_API_KEY`: required for Rafeeq; without it the app works and Rafeeq is hidden.
- `ACCESS_CODE`: optional; visitors enter it once before Rafeeq answers (stops strangers spending your credits).
- `RATE_LIMIT`: optional; Rafeeq requests per visitor IP per 10 minutes (default 40).
- `RAFEEQ_MODEL`: optional; defaults to `claude-opus-5-5`.

Opened inside claude.ai as an artifact (no server), Rafeeq falls back to the claude.ai permission.

## Deploy on Render
In Render: **New → Blueprint**, pick this repo, enter `ANTHROPIC_API_KEY` (and optionally `ACCESS_CODE`), and apply.
`render.yaml` builds the page and starts `server.mjs` as a free web service.

## Hosting notes
Initiatives are saved in each visitor's own browser (localStorage), not shared between people.
