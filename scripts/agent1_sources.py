"""
Source handler registry for competitor scraping.
Each handler knows how to fetch and extract content from a specific source type.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import logging

logger = logging.getLogger(__name__)

# Default headers to mimic a browser
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Rate limiting: seconds between requests to same domain
RATE_LIMIT = 2.0
_last_request_time = {}


def _rate_limited_get(url, timeout=30):
    """Fetch a URL with rate limiting and error handling."""
    from urllib.parse import urlparse
    domain = urlparse(url).netloc

    now = time.time()
    if domain in _last_request_time:
        elapsed = now - _last_request_time[domain]
        if elapsed < RATE_LIMIT:
            time.sleep(RATE_LIMIT - elapsed)

    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        _last_request_time[domain] = time.time()
        resp.raise_for_status()
        return resp
    except requests.RequestException as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def _extract_text(html, max_chars=50000):
    """Extract readable text from HTML, trimmed to max_chars."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove scripts, styles, nav, footer
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    return text[:max_chars]


def _extract_structured(html, max_chars=80000):
    """Extract HTML preserving some structure (headings, lists, links) for Claude to parse."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "iframe"]):
        tag.decompose()
    # Keep main content area if identifiable
    main = soup.find("main") or soup.find("article") or soup.find(role="main")
    if main:
        content = str(main)
    else:
        body = soup.find("body")
        content = str(body) if body else str(soup)
    return content[:max_chars]


# --- Source Handlers ---

def fetch_changelog(url):
    """Fetch and extract changelog/release notes content."""
    resp = _rate_limited_get(url)
    if not resp:
        return {"source_type": "changelog", "url": url, "status": "failed", "content": ""}
    return {
        "source_type": "changelog",
        "url": url,
        "status": "ok",
        "content": _extract_structured(resp.text),
        "text": _extract_text(resp.text),
    }


def fetch_blog(url):
    """Fetch blog/press releases page and extract article summaries."""
    resp = _rate_limited_get(url)
    if not resp:
        return {"source_type": "blog", "url": url, "status": "failed", "content": ""}
    return {
        "source_type": "blog",
        "url": url,
        "status": "ok",
        "content": _extract_structured(resp.text),
        "text": _extract_text(resp.text),
    }


def fetch_pricing(url):
    """Fetch pricing page to detect pricing model shifts."""
    resp = _rate_limited_get(url)
    if not resp:
        return {"source_type": "pricing", "url": url, "status": "failed", "content": ""}
    return {
        "source_type": "pricing",
        "url": url,
        "status": "ok",
        "content": _extract_structured(resp.text),
        "text": _extract_text(resp.text),
    }


def fetch_careers(url):
    """Fetch careers/jobs page for hiring signal analysis."""
    resp = _rate_limited_get(url)
    if not resp:
        return {"source_type": "careers", "url": url, "status": "failed", "content": ""}
    return {
        "source_type": "careers",
        "url": url,
        "status": "ok",
        "content": _extract_structured(resp.text),
        "text": _extract_text(resp.text),
    }


# Handler registry: maps source type to fetch function
SOURCE_HANDLERS = {
    "changelog": fetch_changelog,
    "blog": fetch_blog,
    "pricing": fetch_pricing,
    "careers": fetch_careers,
}


def fetch_all_sources(competitor):
    """
    Fetch all sources for a competitor.
    Args:
        competitor: dict from competitors.json with 'sources' mapping
    Returns:
        dict of source_type -> fetched content
    """
    results = {}
    sources = competitor.get("sources", {})
    for source_type, url in sources.items():
        handler = SOURCE_HANDLERS.get(source_type)
        if handler and url:
            logger.info(f"  Fetching {source_type}: {url}")
            results[source_type] = handler(url)
        else:
            logger.warning(f"  No handler for source type: {source_type}")
    return results
