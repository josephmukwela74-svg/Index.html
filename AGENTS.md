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

## Production Deployment
```
cp .env.example .env   # adjust PORT if needed
docker compose up -d --build
```
- Production uses `Dockerfile` + `docker-compose.yml` (bakes static files into the image).
- `nginx.conf` provides gzip compression, security headers, asset caching, and a `/health` endpoint.
- No environment variables or secrets are required — `PORT` (default 80) is the only configurable value.
- The dev compose (`docker-compose.base44.yml`) bind-mounts source for live editing; production compose builds a self-contained image.

## Notes
- The original repository only contained a truncated README with the beginning of the HTML.
- `index.html` was reconstructed from the README title/description to produce a complete, working page.
- `.gitignore` is an AL/Dynamics 365 Business Central template — not relevant to this static site.
