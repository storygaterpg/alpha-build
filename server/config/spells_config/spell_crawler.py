import requests
from bs4 import BeautifulSoup
import re
import json
import time
import string
import os
import jsonschema

# =============================================================================
# Configuration & Constants
# =============================================================================

# Base URL for all spells on d20pfsrd
BASE_URL = "https://www.d20pfsrd.com/magic/all-spells/"

# Custom headers to mimic a browser
HEADERS = {
    "User-Agent": "PathfinderSpellCrawler/1.0 (compatible; YourName/1.0; +http://example.com)"
}

# Special-case spell name → slug overrides for known typos/misplacements
EXCEPTIONS = {
    "speechreader's sight": "speechreaders-sight",
    "bestow planar infusion i": "bestow-planar-infusion-i",
    "guardian monument, lesser": "guardian-monument-lesser",
    "guardian monument, greater": "guardian-monument-lesser",
    "damnation stride": "damnation-strike",
    "spellbane": "aroden-s-spellbane",
}

# Some slugs live under the wrong first-letter directory on the site
PREFIX_OVERRIDES = {
    "aroden-s-spellbane": "s",
}

# Path to our schema and output file (relative to this script)
BASE_DIR = os.path.dirname(__file__)
SCHEMA_PATH = os.path.join(BASE_DIR, "spell_schema.json")
SPELL_LIST_PATH = os.path.join(BASE_DIR, "sorcerer_wizard_spell_list.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "spells.json")

# Load the JSON schema for spells
with open(SCHEMA_PATH, "r") as f:
    SPELL_SCHEMA = json.load(f)

# =============================================================================
# Utility Functions
# =============================================================================

def clean_spell_name(name: str) -> str:
    """
    Strip off parenthetical text, trailing tokens like 'Lesser', 'Greater', 'Communal', 'Mass',
    and trailing Roman numerals (I, II, III...). Returns the base name.
    """
    # Remove anything in parentheses
    base = re.sub(r"\s*\(.*?\)", "", name).strip()
    # Remove trailing comma‐separated tags (e.g. ", Lesser")
    if "," in base:
        parts = [p.strip() for p in base.split(",")]
        ignore = {"lesser", "greater", "communal", "mass"}
        if any(p.lower() in ignore for p in parts[1:]):
            base = parts[0]
    # Remove trailing Roman numerals
    tokens = base.split()
    romans = {"I","II","III","IV","V","VI","VII","VIII","IX","X"}
    if tokens and tokens[-1].upper() in romans:
        tokens.pop()
        base = " ".join(tokens)
    return base

def slugify(name: str) -> str:
    """
    Convert a spell name into the website's slug, applying:
      1. Overrides from EXCEPTIONS.
      2. clean_spell_name()
      3. Replacing apostrophes and slashes with hyphens.
      4. Lowercasing and stripping invalid chars.
    """
    key = name.lower()
    if key in EXCEPTIONS:
        return EXCEPTIONS[key]
    base = clean_spell_name(name)
    # Normalize punctuation
    slug = base.replace("'", "-").replace("/", "-").lower().strip()
    # Replace spaces with hyphens and strip invalid
    slug = slug.replace(" ", "-")
    valid = string.ascii_lowercase + string.digits + "-"
    return "".join(c for c in slug if c in valid)

def build_spell_url(spell_name: str) -> str:
    """
    Build the full URL for a given spell name.
    Honors any overrides in PREFIX_OVERRIDES to pick the right directory.
    """
    slug = slugify(spell_name)
    first = PREFIX_OVERRIDES.get(slug, slug[0] if slug else "")
    return f"{BASE_URL}{first}/{slug}/"

def fetch_spell_page(url: str) -> str:
    """
    GET the spell page HTML. Returns text or None on error.
    """
    try:
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code == 200:
            return resp.text
        print(f"[ERROR] HTTP {resp.status_code} fetching {url}")
    except Exception as e:
        print(f"[ERROR] Exception fetching {url}: {e}")
    return None

def extract_text_from_element(el) -> str:
    """Safely extract cleaned text from a BeautifulSoup element."""
    return el.get_text(separator=" ", strip=True) if el else ""

# =============================================================================
# Paragraph Isolation Helpers
# =============================================================================

def isolate_summon_variant_paragraphs(content_div, variant_name: str):
    """
    Special handling for 'Summon ...' spells: find the block
    following the 'Table: {variant_name}' marker and stop at the next table.
    """
    paras = content_div.find_all("p")
    capture = False
    heading = f"Table: {variant_name}"
    block = []
    for p in paras:
        txt = extract_text_from_element(p)
        if txt.startswith(heading):
            capture = True
            continue
        # Stop if a new Summon Monster table appears
        if capture and txt.startswith("Table: Summon"):
            break
        if capture:
            # Stop at attribution block
            if txt.startswith("Pathfinder Roleplaying Game"):
                break
            block.append(p)
    if not block:
        print(f"[WARN] No content found for {variant_name}")
    return block

def isolate_variant_paragraphs(content_div, variant_name: str):
    """
    General paragraph isolation: for Summon spells, delegate to the
    table-based isolator; otherwise use heading-based isolator.
    """
    if variant_name.lower().startswith("summon "):
        return isolate_summon_variant_paragraphs(content_div, variant_name)
    # Non-summon: find <h2>-<h6> with exact variant_name
    for level_tag in ("h2","h3","h4","h5","h6"):
        heading = content_div.find(
            lambda t: t.name == level_tag and extract_text_from_element(t) == variant_name
        )
        if heading:
            block = []
            for sib in heading.next_siblings:
                if getattr(sib, "name", None) in ("h2","h3","h4","h5","h6"):
                    break
                if sib.name == "p":
                    txt = extract_text_from_element(sib)
                    # stop at attribution
                    if txt.startswith("Pathfinder Roleplaying Game"):
                        break
                    block.append(sib)
            return block
    # Fallback: entire page
    print(f"[WARN] Heading '{variant_name}' not found; using full content")
    return content_div.find_all("p")

# =============================================================================
# Content Parsing
# =============================================================================

def parse_article_content(soup: BeautifulSoup, variant_name: str) -> dict:
    """
    Extract 'school', 'level', 'casting_time', etc., using divider paragraphs
    from only the relevant block for variant_name.
    """
    data = dict.fromkeys([
        "school","level","casting_time","components","range",
        "area_or_target","duration","saving_throw","spell_resistance","description"
    ], "")
    content_div = soup.find("div", id="article-content") or soup.find("div", class_="entry-content")
    if not content_div:
        print(f"[ERROR] No content div for '{variant_name}'")
        return data

    paras = isolate_variant_paragraphs(content_div, variant_name)
    section = "header"
    desc = []
    for p in paras:
        # Divider detection
        if p.get("class") and "divider" in p.get("class"):
            txt = p.get_text(strip=True).upper()
            if "CASTING" in txt:      section = "casting"
            elif "EFFECT" in txt:     section = "effect"
            elif "DESCRIPTION" in txt:section = "description"
            else:                     section = None
            continue

        full = extract_text_from_element(p)
        if section == "header":
            for part in full.split(";"):
                if "School" in part:
                    data["school"] = part.replace("School","").strip()
                elif "Level" in part:
                    data["level"] = part.replace("Level","").strip()

        elif section == "casting":
            m = re.search(r"Casting Time\s*(.*?)(?:Components|$)", full, re.IGNORECASE)
            if m: data["casting_time"] = m.group(1).strip()
            m = re.search(r"Components\s*(.*)", full, re.IGNORECASE)
            if m: data["components"] = m.group(1).strip()

        elif section == "effect":
            m = re.search(r"Range\s*(.*?)(?:Target|Area|Duration|Saving Throw|Spell Resistance|$)", full, re.IGNORECASE)
            if m: data["range"] = m.group(1).strip()
            m = re.search(r"(?:Target|Area)\s*(.*?)(?:Duration|Saving Throw|Spell Resistance|$)", full, re.IGNORECASE)
            if m: data["area_or_target"] = m.group(1).strip()
            m = re.search(r"Duration\s*(.*?)(?:Saving Throw|Spell Resistance|$)", full, re.IGNORECASE)
            if m: data["duration"] = m.group(1).strip()
            m = re.search(r"Saving Throw\s*(.*?)(?:Spell Resistance|$)", full, re.IGNORECASE)
            if m: data["saving_throw"] = m.group(1).strip()
            m = re.search(r"Spell Resistance\s*(.*)", full, re.IGNORECASE)
            if m: data["spell_resistance"] = m.group(1).strip()

        elif section == "description":
            desc.append(full)

    data["description"] = "\n".join(desc).strip()
    return data

def parse_spell_page(html: str, variant_name: str) -> dict:
    """
    Build a spell dictionary for variant_name:
      - name: overridden to variant_name
      - parse class→level mapping from header
      - parse core fields via parse_article_content
      - no 'id' field; we lookup spells by name
    """
    soup = BeautifulSoup(html, "html.parser")
    content = parse_article_content(soup, variant_name)

    # Start assembling the spell dict
    spell = {
        "name": variant_name,
        "school": content["school"],
        "subschool": "",
        "spell_level": {},
        "casting_time": content["casting_time"],
        "components": [c.strip() for c in content["components"].split(",") if c.strip()],
        "range": content["range"],
        "area_or_target": content["area_or_target"],
        "area_shape": "",
        "duration": content["duration"],
        "dismissible": False,
        "requires_concentration": False,
        "saving_throw": content["saving_throw"],
        "spell_resistance": content["spell_resistance"],
        "arcane_spell_failure": 0,
        "description": content["description"],
        "material_components": "",
        "additional_effects": "",
        "bonus_effects": [],
        "conditions_applied": [],
        "special_mechanics": {},
        "scaling": {},
        "spell_type": "damage"
    }

    # Parse class→level from the header 'level' string
    lvl_str = content["level"]
    if lvl_str:
        for part in re.split(r"[,;]", lvl_str):
            part = part.strip()
            m = re.search(r"([\w/]+)\s+([\d,]+)", part, re.IGNORECASE)
            if m:
                classes, nums = m.group(1), m.group(2)
                for cls in classes.split("/"):
                    cls = cls.strip()
                    for num in nums.split(","):
                        spell["spell_level"][cls] = int(num)

    # Validate against schema
    try:
        jsonschema.validate(instance=spell, schema=SPELL_SCHEMA)
    except jsonschema.ValidationError as e:
        print(f"[VALIDATION ERROR] '{variant_name}': {e.message}")

    return spell

# =============================================================================
# Main Crawling Logic
# =============================================================================

def crawl_spell(spell_name: str) -> dict:
    """
    Crawl and parse one spell variant by name.
    Returns the spell dict or None on failure.
    """
    url = build_spell_url(spell_name)
    print(f"[INFO] Crawling '{spell_name}' → {url}")
    html = fetch_spell_page(url)
    if not html:
        print(f"[ERROR] Could not fetch page for '{spell_name}'")
        return None
    return parse_spell_page(html, spell_name)

def main():
    # Load existing spells (handle empty/invalid JSON gracefully)
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, "r") as f:
                existing = json.load(f)
        except (json.JSONDecodeError, ValueError):
            print(f"[WARN] '{OUTPUT_PATH}' invalid or empty, starting fresh")
            existing = []
    else:
        existing = []

    names = {s["name"].lower() for s in existing}

    # Load our sorcerer/wizard spell list
    with open(SPELL_LIST_PATH, "r") as f:
        sw_list = json.load(f)

    # Iterate levels in numeric order (0th, 1st, 2nd, …)
    levels = sorted(sw_list.keys(), key=lambda x: int(re.search(r"\d+", x).group()))
    for lvl in levels:
        for name in sw_list[lvl]:
            if name.lower() in names:
                continue  # already crawled
            result = crawl_spell(name)
            if result:
                existing.append(result)
                names.add(name.lower())
            else:
                print(f"[ERROR] Failed to crawl '{name}'")
            time.sleep(1)  # politeness delay

    # Write updated spells.json
    with open(OUTPUT_PATH, "w") as f:
        json.dump(existing, f, indent=2)
    print(f"[INFO] Crawling complete: {len(existing)} spells saved in '{OUTPUT_PATH}'")

if __name__ == "__main__":
    main()
