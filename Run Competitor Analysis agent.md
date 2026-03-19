# Run Competitor Analysis Agent

## How It Works

You run the analysis locally using Claude Code (no API key needed), then push to GitHub. The dashboard auto-deploys to GitHub Pages.

```
Local (Claude Code)              GitHub (auto)
─────────────────────            ──────────────
Run scraper + analysis    →      git push
Claude Code handles API          GitHub Pages deploys dashboard
Data saved as JSON               Live at https://Sooryavenkat.github.io/competitor-intelligence/
```

## Prerequisites

Install Python packages once:
```bash
pip install requests beautifulsoup4 anthropic
```

## Monthly Workflow (3 Steps)

### Step 1: Run the analysis in Claude Code

Open Claude Code and ask:
```
Run the competitor scraper: cd to Soorya_Workspace/Agents/Competitor_Roadmap and execute python scripts/agent1_scrape.py
```

Or use the skill: `/competitor-scraper`

### Step 2: Build the dashboard

```
Run python scripts/agent2_build.py in the Competitor_Roadmap folder
```

Or use the skill: `/competitor-dashboard`

### Step 3: Push to deploy

```bash
cd "C:\Users\Soorya_Venkatachalam\Desktop\Google Antigravity\Soorya_Workspace\Agents\Competitor_Roadmap"
git add .
git commit -m "Update competitor data YYYY-MM"
git push
```

GitHub Actions automatically deploys the dashboard after every push.

## Useful Flags (for Step 1)

| Flag | What it does |
|---|---|
| `--competitor snyk` | Run for just one competitor (faster for testing) |
| `--month 2026-02` | Run for a specific past month |
| `--backfill` | Populate last 6 months in one go |

## Output

- **JSON data** saved to `data/{YYYY-MM}/{competitor}.json`
- **Cross-competitor insights** saved to `data/{YYYY-MM}/insights.json`
- **Dashboard** at `http://localhost:8080` (local) or GitHub Pages (cloud) with four views:
  - Overview — competitor cards with threat levels and metrics
  - Timeline — features shipped across months
  - Competitor Detail — full intelligence report per competitor
  - Securin Impact — what to build next, grouped by Securin product

---

## Cloud Hosting Setup (GitHub Pages)

Already configured. Dashboard auto-deploys on every `git push`.

### One-Time Setup (already done)

1. Repo: https://github.com/Sooryavenkat/competitor-intelligence
2. **Enable GitHub Pages:**
   - Settings > Pages
   - Source: **Deploy from a branch**
   - Branch: `gh-pages` / `root`
   - Save
3. Dashboard will be live at: `https://Sooryavenkat.github.io/competitor-intelligence/`
