# Run Competitor Analysis Agent

## How It Works

You run the analysis locally using Claude Code (no API key needed), then push to GitHub. The dashboard auto-deploys to Netlify.

```
Local (Claude Code)              GitHub + Netlify (auto)
─────────────────────            ───────────────────────
Run scraper + analysis    →      git push
Claude Code handles API          Netlify deploys dashboard
Data saved as JSON               Live at your Netlify URL
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

Netlify automatically deploys the dashboard after every push.

## Useful Flags (for Step 1)

| Flag | What it does |
|---|---|
| `--competitor snyk` | Run for just one competitor (faster for testing) |
| `--month 2026-02` | Run for a specific past month |
| `--backfill` | Populate last 6 months in one go |

## Output

- **JSON data** saved to `data/{YYYY-MM}/{competitor}.json`
- **Cross-competitor insights** saved to `data/{YYYY-MM}/insights.json`
- **Dashboard** at `http://localhost:8080` (local) or Netlify (cloud) with four views:
  - Overview — competitor cards with threat levels and metrics
  - Timeline — features shipped across months
  - Competitor Detail — full intelligence report per competitor
  - Securin Impact — what to build next, grouped by Securin product

---

## Cloud Hosting Setup (Netlify — Free, Private Repo Supported)

Repo stays private. Dashboard is hosted on Netlify with auto-deploy on every `git push`.

### One-Time Setup

1. **Repo:** https://github.com/Sooryavenkat/competitor-intelligence (private)

2. **Create Netlify site:**
   - Go to [netlify.com](https://app.netlify.com/) and sign in with GitHub
   - Click **Add new site** > **Import an existing project** > **GitHub**
   - Select the `competitor-intelligence` repo
   - Set **Publish directory** to: `dashboard`
   - Click **Deploy site**

3. **Get your Netlify credentials (for auto-deploy via GitHub Actions):**
   - **Site ID:** Netlify > Site settings > General > Site ID (copy it)
   - **Auth Token:** Netlify > User settings > Applications > Personal access tokens > New access token

4. **Add secrets to GitHub repo:**
   - Go to https://github.com/Sooryavenkat/competitor-intelligence/settings/secrets/actions
   - Add two secrets:
     - `NETLIFY_SITE_ID` — paste your Site ID
     - `NETLIFY_AUTH_TOKEN` — paste your access token

5. **Done.** Every `git push` now auto-deploys the dashboard.

### Your dashboard URL

After first deploy, Netlify gives you a URL like:
`https://competitor-intelligence-xyz.netlify.app`

You can customize this in Netlify > Site settings > Domain management.
