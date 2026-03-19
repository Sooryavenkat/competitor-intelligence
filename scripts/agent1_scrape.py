"""
Agent 1: Staff PM — Scraper + Analyst
Scrapes competitor public data and uses Claude API to generate strategic intelligence.

Usage:
    python agent1_scrape.py                  # Run for current month
    python agent1_scrape.py --month 2025-10  # Run for specific month
    python agent1_scrape.py --backfill       # Backfill last 6 months
    python agent1_scrape.py --competitor snyk # Run for single competitor
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime, timedelta
from pathlib import Path

import anthropic

# Add parent dir so we can import sibling modules
sys.path.insert(0, os.path.dirname(__file__))
from agent1_sources import fetch_all_sources

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "config" / "competitors.json"
DATA_DIR = BASE_DIR / "data"

# Staff PM System Prompt
STAFF_PM_SYSTEM_PROMPT = """You are a Staff Product Manager specializing in competitive intelligence for cybersecurity companies. You work at Securin, which offers: ASM, Sentry (EASM), Triage (UVM), Core (VI), CSPM, ASPM, and APT products.

Your job is to analyze raw scraped data from a competitor's public presence (changelog, blog, pricing page, careers page) and produce a structured competitive intelligence report.

Read between the lines to uncover:
- Engineering capacity and strategic direction
- Where they're investing headcount
- Whether they're shifting upmarket or downmarket
- Integration ecosystem momentum
- AI/ML feature adoption

You MUST output valid JSON matching this exact structure:

{
  "competitor": "<name>",
  "analysis_month": "<YYYY-MM>",
  "executive_strategic_insight": {
    "core_theme": "<one sentence: the overarching strategic move this quarter>",
    "strategic_focus": "<2-3 sentences on direction>",
    "ecosystem_momentum": "<integration count/partnerships observed>",
    "persona_shift": "<who are features targeting: developers, CISOs, SOC analysts, etc.>",
    "pricing_model_shift": "<PLG vs enterprise, free trial changes, tier changes>"
  },
  "engineering_capacity": {
    "total_updates_shipped": "<number or estimate>",
    "new_features_vs_maintenance_ratio": "<e.g. 60/40>",
    "velocity_assessment": "<low/medium/high with brief justification>"
  },
  "resource_allocation": [
    {
      "bucket": "<e.g. Core Platform>",
      "effort_pct": <number>,
      "key_items": ["<what shipped in this bucket>"]
    }
  ],
  "intelligence_signals": {
    "job_board_signals": "<what roles are they hiring for, what does it suggest>",
    "target_users": "<who they're building for>",
    "monetization_approach": "<how they make money, any changes>",
    "differentiators": "<what makes them unique vs Securin>"
  },
  "securin_implications": {
    "gaps_exposed": ["<things Securin is missing that this competitor has>"],
    "areas_of_focus": ["<recommended areas for Securin's next 2 quarters>"],
    "threat_level": "<low/medium/high — how much does this competitor threaten Securin>",
    "product_specific": {
      "<securin product>": "<specific implication>"
    }
  }
}

Be analytical and specific. Base everything on evidence from the scraped data. If data is insufficient for a field, say "Insufficient data" rather than guessing. Always produce valid JSON — no markdown, no code fences."""


def load_config():
    """Load competitor configuration."""
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def analyze_competitor(client, competitor, scraped_data, month):
    """Send scraped data to Claude API for analysis."""
    # Build the content message with all scraped sources
    content_parts = []
    for source_type, data in scraped_data.items():
        if data.get("status") == "ok" and data.get("text"):
            content_parts.append(f"=== {source_type.upper()} ({data['url']}) ===\n{data['text']}")

    if not content_parts:
        logger.warning(f"  No usable content scraped for {competitor['name']}")
        return None

    scraped_content = "\n\n".join(content_parts)

    user_message = f"""Analyze the following scraped data for competitor: {competitor['name']}
Website: {competitor['website']}
Securin product overlap: {', '.join(competitor['securin_overlap'])}
Analysis month: {month}

--- SCRAPED DATA ---
{scraped_content}
--- END SCRAPED DATA ---

Produce the competitive intelligence JSON report."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=STAFF_PM_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        # Extract JSON from response
        response_text = response.content[0].text.strip()
        # Try to parse as JSON
        return json.loads(response_text)
    except json.JSONDecodeError:
        logger.error(f"  Claude returned non-JSON for {competitor['name']}, saving raw response")
        return {"raw_response": response_text, "parse_error": True}
    except Exception as e:
        logger.error(f"  Claude API error for {competitor['name']}: {e}")
        return None


def generate_cross_competitor_insights(client, all_results, month):
    """Generate consolidated insights across all competitors."""
    insights_prompt = f"""You have individual competitive intelligence reports for the following cybersecurity competitors, all analyzed for {month}.

Produce a consolidated cross-competitor insights report as JSON:

{{
  "month": "{month}",
  "industry_themes": ["<top 3-5 themes across all competitors>"],
  "hottest_investment_areas": [
    {{"area": "<name>", "competitors_investing": ["<names>"], "intensity": "high/medium/low"}}
  ],
  "securin_priority_matrix": [
    {{
      "securin_product": "<product name>",
      "urgency": "high/medium/low",
      "competitors_ahead": ["<names>"],
      "recommended_action": "<what to build/improve>"
    }}
  ],
  "talent_war_signals": "<what hiring patterns suggest across the sector>",
  "pricing_trends": "<any pricing model shifts observed>",
  "overall_threat_assessment": "<paragraph summarizing competitive landscape>"
}}

Here are the individual reports:

{json.dumps(all_results, indent=2, default=str)}

Produce valid JSON only — no markdown, no code fences."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system="You are a senior competitive intelligence analyst. Synthesize individual competitor reports into actionable cross-competitor insights. Output valid JSON only.",
            messages=[{"role": "user", "content": insights_prompt}],
        )
        return json.loads(response.content[0].text.strip())
    except Exception as e:
        logger.error(f"Cross-competitor insights generation failed: {e}")
        return {"error": str(e)}


def run_for_month(client, config, month, target_competitor=None):
    """Run the full pipeline for a single month."""
    month_dir = DATA_DIR / month
    month_dir.mkdir(parents=True, exist_ok=True)

    competitors = config["competitors"]
    if target_competitor:
        competitors = [c for c in competitors if c["slug"] == target_competitor]
        if not competitors:
            logger.error(f"Competitor '{target_competitor}' not found in config")
            return

    all_results = {}

    for competitor in competitors:
        slug = competitor["slug"]
        output_path = month_dir / f"{slug}.json"

        # Skip if already analyzed (unless re-running)
        if output_path.exists():
            logger.info(f"[{slug}] Already analyzed, loading existing data")
            with open(output_path) as f:
                all_results[slug] = json.load(f)
            continue

        logger.info(f"[{slug}] Scraping sources...")
        scraped_data = fetch_all_sources(competitor)

        logger.info(f"[{slug}] Analyzing with Claude API...")
        analysis = analyze_competitor(client, competitor, scraped_data, month)

        if analysis:
            with open(output_path, "w") as f:
                json.dump(analysis, f, indent=2)
            all_results[slug] = analysis
            logger.info(f"[{slug}] Saved to {output_path}")
        else:
            logger.warning(f"[{slug}] No analysis produced")

    # Generate cross-competitor insights (only if we have multiple results)
    if len(all_results) > 1:
        logger.info("Generating cross-competitor insights...")
        insights = generate_cross_competitor_insights(client, all_results, month)
        insights_path = month_dir / "insights.json"
        with open(insights_path, "w") as f:
            json.dump(insights, f, indent=2)
        logger.info(f"Saved insights to {insights_path}")

    return all_results


def main():
    parser = argparse.ArgumentParser(description="Competitor Roadmap Scraper + Analyst (Agent 1)")
    parser.add_argument("--month", type=str, help="Target month (YYYY-MM), defaults to current")
    parser.add_argument("--backfill", action="store_true", help="Backfill last 6 months")
    parser.add_argument("--competitor", type=str, help="Run for single competitor (slug)")
    args = parser.parse_args()

    # Check API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    config = load_config()

    if args.backfill:
        # Run for last 6 months
        now = datetime.now()
        for i in range(6, 0, -1):
            target = now - timedelta(days=30 * i)
            month = target.strftime("%Y-%m")
            logger.info(f"\n{'='*60}\nBackfill: {month}\n{'='*60}")
            run_for_month(client, config, month, args.competitor)
    else:
        month = args.month or datetime.now().strftime("%Y-%m")
        logger.info(f"\n{'='*60}\nRunning for: {month}\n{'='*60}")
        run_for_month(client, config, month, args.competitor)

    logger.info("Done!")


if __name__ == "__main__":
    main()
