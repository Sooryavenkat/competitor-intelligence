---
name: competitor-scraper
description: Run the competitor intelligence scraper (Agent 1) — scrapes public data from 6 cybersecurity competitors and uses Claude API to generate strategic analysis
user_invocable: true
---

# Competitor Scraper Skill

## What it does
Scrapes changelogs, blogs, pricing pages, and careers pages from Securin's cybersecurity competitors, then sends the raw content to Claude API with a Staff PM system prompt to produce structured competitive intelligence JSON.

## Competitors tracked
Snyk, Panther, Horizon3.ai/NodeZero, LimaCharlie, Picus Security, CyCognito

## Usage

Run the scraper for the current month:
```bash
cd "Soorya_Workspace/Agents/Competitor_Roadmap"
python scripts/agent1_scrape.py
```

Run for a specific month:
```bash
python scripts/agent1_scrape.py --month 2025-10
```

Backfill last 6 months:
```bash
python scripts/agent1_scrape.py --backfill
```

Single competitor:
```bash
python scripts/agent1_scrape.py --competitor snyk
```

## Prerequisites
- `ANTHROPIC_API_KEY` environment variable must be set
- Python packages: `requests`, `beautifulsoup4`, `anthropic`
- Install: `pip install requests beautifulsoup4 anthropic`

## Output
JSON files saved to `data/{YYYY-MM}/{competitor-slug}.json` plus `insights.json` for cross-competitor analysis.

After running, execute `python scripts/agent2_build.py` to update the dashboard.
