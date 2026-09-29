# AGENTS.md

## Project Overview
JMK CANARY — a static single-page HTML site for OHS Inspections & Vehicle Compliance in Zambia.

## Architecture
- **Frontend**: Single `index.html` file (no framework, no build step, no dependencies).
- **Serving**: `nginx:alpine` via `docker-compose.base44.yml`, host port 3000 → container 80.
- **No backend, no database, no external services, no secrets required.**

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
The site is served at `http://localhost:3000`.

## Notes
- The original repository only contained a truncated README with the beginning of the HTML.
- `index.html` was reconstructed from the README title/description to produce a complete, working page.
- `.gitignore` is an AL/Dynamics 365 Business Central template — not relevant to this static site.
