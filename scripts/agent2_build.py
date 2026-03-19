"""
Agent 2: Developer — Dashboard Builder
Reads Agent 1's JSON output and generates manifest + copies data for the static dashboard.

Usage:
    python agent2_build.py              # Build/update dashboard data
    python agent2_build.py --serve      # Build and start local server
"""

import os
import sys
import json
import shutil
import argparse
import http.server
import socketserver
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DASHBOARD_DIR = BASE_DIR / "dashboard"
DASHBOARD_DATA_DIR = DASHBOARD_DIR / "data"
CONFIG_PATH = BASE_DIR / "config" / "competitors.json"


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


def build_manifest():
    """Scan data directory and build manifest.json for the dashboard."""
    config = load_config()
    competitor_slugs = {c["slug"]: c["name"] for c in config["competitors"]}

    manifest = {
        "generated_at": datetime.now().isoformat(),
        "competitors": [],
        "months": [],
        "month_data": {},
    }

    # Build competitor list
    for c in config["competitors"]:
        manifest["competitors"].append({
            "slug": c["slug"],
            "name": c["name"],
            "securin_overlap": c["securin_overlap"],
        })

    # Scan data directories for months
    if not DATA_DIR.exists():
        print("No data directory found. Run agent1_scrape.py first.")
        return manifest

    months = sorted([
        d.name for d in DATA_DIR.iterdir()
        if d.is_dir() and len(d.name) == 7 and d.name[4] == "-"
    ], reverse=True)

    manifest["months"] = months

    for month in months:
        month_dir = DATA_DIR / month
        month_entry = {"competitors": [], "has_insights": False}

        for f in month_dir.iterdir():
            if f.suffix == ".json":
                if f.stem == "insights":
                    month_entry["has_insights"] = True
                elif f.stem in competitor_slugs:
                    month_entry["competitors"].append(f.stem)

        manifest["month_data"][month] = month_entry

    return manifest


def copy_data_to_dashboard():
    """Copy JSON data files to dashboard/data/ for fetch() access."""
    DASHBOARD_DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not DATA_DIR.exists():
        print("No data directory found.")
        return

    # Copy each month's data
    for month_dir in DATA_DIR.iterdir():
        if month_dir.is_dir() and len(month_dir.name) == 7:
            dest_dir = DASHBOARD_DATA_DIR / month_dir.name
            dest_dir.mkdir(parents=True, exist_ok=True)
            for json_file in month_dir.glob("*.json"):
                shutil.copy2(json_file, dest_dir / json_file.name)
                print(f"  Copied {month_dir.name}/{json_file.name}")


def main():
    parser = argparse.ArgumentParser(description="Dashboard Builder (Agent 2)")
    parser.add_argument("--serve", action="store_true", help="Start local HTTP server after build")
    parser.add_argument("--port", type=int, default=8080, help="Port for local server (default: 8080)")
    args = parser.parse_args()

    print("Building dashboard data...")

    # 1. Build manifest
    manifest = build_manifest()
    manifest_path = DASHBOARD_DATA_DIR / "manifest.json"
    DASHBOARD_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest: {len(manifest['months'])} months, {len(manifest['competitors'])} competitors")

    # 2. Copy data files
    copy_data_to_dashboard()

    print(f"\nDashboard ready at: {DASHBOARD_DIR / 'index.html'}")

    # 3. Optional: serve locally
    if args.serve:
        os.chdir(DASHBOARD_DIR)
        handler = http.server.SimpleHTTPRequestHandler
        with socketserver.TCPServer(("", args.port), handler) as httpd:
            print(f"Serving dashboard at http://localhost:{args.port}")
            print("Press Ctrl+C to stop.")
            httpd.serve_forever()


if __name__ == "__main__":
    main()
