# Run Competitor Analysis Agent

## Prerequisites

1. **Python packages** — install once:
   ```bash
   pip install requests beautifulsoup4 anthropic
   ```

2. **API Key** — set your Anthropic API key before running:
   ```bash
   set ANTHROPIC_API_KEY=your-key-here
   ```

## Quick Start (One Command)

```bash
cd "C:\Users\Soorya_Venkatachalam\Desktop\Google Antigravity\Soorya_Workspace\Agents\Competitor_Roadmap"
run.bat
```

This will:
1. Scrape all 6 competitors (Snyk, Panther, Horizon3.ai, LimaCharlie, Picus, CyCognito)
2. Send scraped data to Claude API for strategic analysis
3. Generate cross-competitor insights
4. Build the dashboard and serve it at `http://localhost:8080`

## Useful Flags

| Command | What it does |
|---|---|
| `run.bat` | Full run — all competitors, current month |
| `run.bat --competitor snyk` | Run for just one competitor (faster for testing) |
| `run.bat --month 2026-02` | Run for a specific past month |
| `run.bat --backfill` | Populate last 6 months in one go |

## Output

- **JSON data** saved to `data/{YYYY-MM}/{competitor}.json`
- **Cross-competitor insights** saved to `data/{YYYY-MM}/insights.json`
- **Dashboard** opens at `http://localhost:8080` with four views:
  - Overview — competitor cards with threat levels and metrics
  - Timeline — features shipped across months
  - Competitor Detail — full intelligence report per competitor
  - Securin Impact — what to build next, grouped by Securin product

---

## Cloud Hosting (GitHub Actions + GitHub Pages)

Host the dashboard online and automate monthly scraping — fully free.

### One-Time Setup

1. **Create a GitHub repo** and push this folder:
   ```bash
   cd "C:\Users\Soorya_Venkatachalam\Desktop\Google Antigravity\Soorya_Workspace\Agents\Competitor_Roadmap"
   git init
   git add .
   git commit -m "Initial commit: competitor intelligence agent"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/competitor-intelligence.git
   git push -u origin main
   ```

2. **Add your API key as a GitHub Secret:**
   - Go to your repo on GitHub
   - Settings > Secrets and variables > Actions > New repository secret
   - Name: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key

3. **Enable GitHub Pages:**
   - Settings > Pages
   - Source: **Deploy from a branch**
   - Branch: `gh-pages` / `root`
   - Save

4. **Run the workflow for the first time:**
   - Go to Actions tab in your repo
   - Click "Monthly Competitor Intelligence" on the left
   - Click "Run workflow" button

### What Happens Automatically

- **1st of every month at 9:00 AM UTC** — GitHub Actions runs the scraper, analyzes all 6 competitors via Claude API, builds the dashboard, and deploys it
- Data is committed back to the repo so you have full history
- Dashboard is live at `https://YOUR_USERNAME.github.io/competitor-intelligence/`

### Manual Trigger

Anytime you want a fresh run, go to Actions > "Monthly Competitor Intelligence" > Run workflow. No terminal needed.
