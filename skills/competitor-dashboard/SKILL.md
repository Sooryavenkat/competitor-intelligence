---
name: competitor-dashboard
description: Build/update the competitor intelligence dashboard from scraped JSON data
user_invocable: true
---

# Competitor Dashboard Builder Skill

## What it does
Reads JSON output from Agent 1 (competitor scraper), generates a manifest.json index, copies data to the dashboard directory, and the static HTML/CSS/JS dashboard renders it.

## Usage

Build the dashboard:
```bash
cd "Soorya_Workspace/Agents/Competitor_Roadmap"
python scripts/agent2_build.py
```

Build and serve locally:
```bash
python scripts/agent2_build.py --serve --port 8080
```

Then open `dashboard/index.html` in a browser (or http://localhost:8080 if using --serve).

## Dashboard Views
1. **Monthly Overview** — Competitor cards with key metrics, threat level, investment areas
2. **Timeline** — Swim-lane view of features shipped across months, color-coded by category
3. **Competitor Detail** — Full report: executive insight, engineering metrics, resource allocation, signals
4. **Securin Impact** — Cross-competitor analysis of what Securin should build next

## Prerequisites
- Python 3.x (no extra packages needed for agent2)
- Data must exist in `data/` directory (run agent1_scrape.py first)
