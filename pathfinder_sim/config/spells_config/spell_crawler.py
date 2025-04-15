import requests
from bs4 import BeautifulSoup
import re
import json
import time
import string
import os
import jsonschema

# Base URL for all spells on d20pfsrd
BASE_URL = "https://www.d20pfsrd.com/magic/all-spells/"

# Custom headers to mimic a browser and avoid being blocked
HEADERS = {
    "User-Agent": "PathfinderSpellCrawler/1.0 (compatible; YourName/1.0; +http://example.com)"
}

# Load the spell schema from the same directory as this script.
schema_path = os.path.join(os.path.dirname(__file__), "spell_schema.json")
with open(schema_path, "r") as schema_file:
    SPELL_SCHEMA = json.load(schema_file)

def clean_spell_name(name: str) -> str:
    """
    Clean the spell name for URL generation by:
      - Removing text within parentheses.
      - Removing trailing comma-separated tokens if they are in a defined ignore set (e.g., 'lesser', 'greater', 'communal', 'mass').
      - Removing trailing roman numeral tokens (e.g. 'IV', 'II').
    """
    # Remove text within parentheses.
    name = re.sub(r"\s*\(.*?\)", "", name).strip()
    # Remove trailing comma-separated tokens if present.
    if "," in name:
        parts = [p.strip() for p in name.split(",")]
        base_name = parts[0]
        ignore_tokens = {"lesser", "greater", "communal", "mass"}
        if any(token.lower() in ignore_tokens for token in parts[1:]):
            name = base_name
    # Remove trailing roman numeral tokens.
    tokens = name.split()
    roman_numerals = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"}
    if tokens and tokens[-1].upper() in roman_numerals:
        tokens = tokens[:-1]
        name = " ".join(tokens)
    return name.strip()

def slugify(name: str) -> str:
    """
    Convert a spell name to a URL-friendly slug.
    First, clean the spell name, then replace apostrophes and forward slashes with hyphens,
    lowercase the text, replace spaces with hyphens, and remove any remaining unwanted punctuation.
    """
    cleaned = clean_spell_name(name)
    # Replace apostrophes and forward slashes with hyphens.
    cleaned = cleaned.replace("'", "-").replace("/", "-")
    cleaned = cleaned.lower().strip().replace(" ", "-")
    valid_chars = string.ascii_lowercase + string.digits + "-"
    return "".join(ch for ch in cleaned if ch in valid_chars)

def build_spell_url(spell_name: str) -> str:
    """
    Construct the URL for a given spell using the first letter of the cleaned slug.
    """
    slug = slugify(spell_name)
    first_letter = slug[0] if slug else ""
    return f"{BASE_URL}{first_letter}/{slug}/"

def fetch_spell_page(url: str) -> str:
    """
    Fetch the HTML content of a spell page.
    """
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            return response.text
        else:
            print(f"Error: Received status code {response.status_code} for URL {url}")
            return None
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def extract_text_from_element(element):
    """Helper function to extract clean text from a BeautifulSoup element."""
    return element.get_text(separator=" ", strip=True) if element else ""

def parse_article_content(soup: BeautifulSoup) -> dict:
    """
    Parse the article content from the page and extract key spell information.
    The page is divided by divider paragraphs with texts such as CASTING, EFFECT, and DESCRIPTION.
    """
    data = {
        "school": "",
        "level": "",
        "casting_time": "",
        "components": "",
        "range": "",
        "area_or_target": "",
        "duration": "",
        "saving_throw": "",
        "spell_resistance": "",
        "description": ""
    }
    # Find the main content; first try id="article-content", fallback to class="entry-content"
    content_div = soup.find("div", id="article-content")
    if not content_div:
        content_div = soup.find("div", class_="entry-content")
    if not content_div:
        return data
    paragraphs = content_div.find_all("p")
    section = "header"  # initial state before any divider is encountered
    description_paras = []
    for p in paragraphs:
        # Check for divider paragraphs.
        if p.get("class") and "divider" in p.get("class"):
            txt = p.get_text(strip=True).upper()
            if "CASTING" in txt:
                section = "casting"
            elif "EFFECT" in txt:
                section = "effect"
            elif "DESCRIPTION" in txt:
                section = "description"
            else:
                section = None
            continue

        if section == "header":
            full_text = extract_text_from_element(p)
            parts = full_text.split(";")
            for part in parts:
                if "School" in part:
                    data["school"] = part.replace("School", "").strip()
                elif "Level" in part:
                    data["level"] = part.replace("Level", "").strip()
        elif section == "casting":
            full_text = extract_text_from_element(p)
            ct_match = re.search(r"Casting Time\s*(.*?)(?:Components|$)", full_text, re.IGNORECASE)
            if ct_match:
                data["casting_time"] = ct_match.group(1).strip()
            comp_match = re.search(r"Components\s*(.*)", full_text, re.IGNORECASE)
            if comp_match:
                data["components"] = comp_match.group(1).strip()
        elif section == "effect":
            full_text = extract_text_from_element(p)
            range_match = re.search(r"Range\s*(.*?)(?:Target|Area|Duration|Saving Throw|Spell Resistance|$)", full_text, re.IGNORECASE)
            if range_match:
                data["range"] = range_match.group(1).strip()
            target_match = re.search(r"(?:Target|Area)\s*(.*?)(?:Duration|Saving Throw|Spell Resistance|$)", full_text, re.IGNORECASE)
            if target_match:
                data["area_or_target"] = target_match.group(1).strip()
            duration_match = re.search(r"Duration\s*(.*?)(?:Saving Throw|Spell Resistance|$)", full_text, re.IGNORECASE)
            if duration_match:
                data["duration"] = duration_match.group(1).strip()
            save_match = re.search(r"Saving Throw\s*(.*?)(?:Spell Resistance|$)", full_text, re.IGNORECASE)
            if save_match:
                data["saving_throw"] = save_match.group(1).strip()
            sr_match = re.search(r"Spell Resistance\s*(.*)", full_text, re.IGNORECASE)
            if sr_match:
                data["spell_resistance"] = sr_match.group(1).strip()
        elif section == "description":
            description_paras.append(extract_text_from_element(p))
    data["description"] = "\n".join(description_paras)
    return data

def parse_spell_page(html: str) -> dict:
    """
    Parse the HTML of a spell page and map the content to our spell_schema.
    """
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    name = extract_text_from_element(h1) if h1 else "Unknown Spell"
    
    content_data = parse_article_content(soup)
    
    spell = {
        "id": slugify(name),
        "name": name,
        "school": content_data.get("school", ""),
        "subschool": "",
        "spell_level": {},   # To be filled from the 'level' field.
        "casting_time": content_data.get("casting_time", ""),
        "components": [comp.strip() for comp in content_data.get("components", "").split(",") if comp.strip()],
        "range": content_data.get("range", ""),
        "area_or_target": content_data.get("area_or_target", ""),
        "area_shape": "",
        "duration": content_data.get("duration", ""),
        "dismissible": False,
        "requires_concentration": False,
        "saving_throw": content_data.get("saving_throw", ""),
        "spell_resistance": content_data.get("spell_resistance", ""),
        "arcane_spell_failure": 0,
        "description": content_data.get("description", ""),
        "material_components": "",
        "additional_effects": "",
        "bonus_effects": [],
        "conditions_applied": [],
        "special_mechanics": {},
        "scaling": {},
        "spell_type": "damage"
    }
    # Process the 'level' field to build a mapping.
    level_str = content_data.get("level", "")
    level_mapping = {}
    if level_str:
        parts = re.split(r"[,;]", level_str)
        for part in parts:
            part = part.strip()
            match = re.search(r"([\w/]+)\s+(\d+)", part, re.IGNORECASE)
            if match:
                classes = match.group(1).split("/")
                lvl = int(match.group(2))
                for cls in classes:
                    cls_name = cls.strip()
                    if cls_name:
                        level_mapping[cls_name] = lvl
    spell["spell_level"] = level_mapping

    try:
        jsonschema.validate(instance=spell, schema=SPELL_SCHEMA)
    except jsonschema.ValidationError as ve:
        print(f"Validation error for spell '{name}': {ve.message}")
    
    return spell

def crawl_spell(spell_name: str) -> dict:
    """
    Crawl a single spell page using the provided spell name.
    """
    url = build_spell_url(spell_name)
    print(f"Crawling {spell_name} from {url}")
    html = fetch_spell_page(url)
    if html:
        spell_data = parse_spell_page(html)
        print(f"Extracted spell: {spell_data['name']}")
        return spell_data
    else:
        print(f"Failed to fetch spell: {spell_name}")
        return None

def main():
    # Compute file paths relative to this script.
    base_dir = os.path.dirname(__file__)
    spells_json_path = os.path.join(base_dir, "spells.json")
    spell_list_path = os.path.join(base_dir, "sorcerer_wizard_spell_list.json")
    
    # Always start from the beginning: load the entire spell list.
    if os.path.exists(spells_json_path):
        with open(spells_json_path, "r") as f:
            existing_spells = json.load(f)
    else:
        existing_spells = []
    
    existing_spell_names = {spell["name"].lower() for spell in existing_spells}
    
    # Load the sorcerer/wizard spell list.
    with open(spell_list_path, "r") as f:
        sw_spell_list = json.load(f)
    
    # Instead of union-ing into a set, iterate through levels in sorted order.
    # Sort the levels by extracting the numeric portion from the key.
    sorted_levels = sorted(sw_spell_list.keys(), key=lambda x: int(re.search(r"\d+", x).group()))
    
    for level in sorted_levels:
        spells_in_level = sw_spell_list[level]
        for spell_name in spells_in_level:
            if spell_name.lower() in existing_spell_names:
                print(f"Spell '{spell_name}' already exists. Skipping.")
                continue
            new_spell = crawl_spell(spell_name)
            if new_spell:
                existing_spells.append(new_spell)
                existing_spell_names.add(spell_name.lower())
            time.sleep(2)  # Delay between requests
    
    # Write the updated spells list back to spells.json.
    with open(spells_json_path, "w") as f:
        json.dump(existing_spells, f, indent=2)
    print(f"Crawling complete. Updated spells data written to {spells_json_path}")

if __name__ == "__main__":
    main()
