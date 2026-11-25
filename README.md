# CDP Learning Accelerator Demo

A browser-only app that walks a platform initiative through the CDP Learning Framework:
Define → Design → Assess, ending with an Initiative Design Document for the vendor.

## Structure
- `js/`, `css/`, `assets/`: source modules
- `dev.html`: loads the modules directly (serve over HTTP)
- `index.html`: single self-contained build (`node tools/build.mjs`)
- `tests/`: unit tests (`node --test tests/`) and an end-to-end run (`node tests/e2e.cjs`, needs Playwright)

## Deploy on Render
`render.yaml` defines a static site that runs `node tools/build.mjs` and serves the repo root.
In Render: **New → Blueprint**, pick this repo, and apply.

## Hosting notes
Outside claude.ai the app has no shared database or Claude access, so:
- initiatives are saved in each visitor's own browser (localStorage), not shared between people;
- the Rafeeq AI assistant is hidden.
