"""Generate synthetic civic feedback data with injected anomaly spikes."""
import random
import csv
import os
from datetime import datetime, timedelta

random.seed(42)

ZONES = ["Zone A", "Zone B", "Zone C", "Zone D", "Zone E", "Zone F"]
CATEGORIES = ["road", "water", "sanitation", "electricity", "safety", "transports"]
SOURCES = ["app", "call", "social"]

COMPLAINT_TEMPLATES = {
    "road": [
        "Large pothole on the main road near the market, vehicles are swerving dangerously.",
        "The road outside my house has a massive crater that damaged my car's tire.",
        "Multiple potholes on the highway stretch, causing accidents during rain.",
        "Pothole near the school bus stop has been there for 3 months now.",
        "The road repairs done last month have already broken down, potholes everywhere.",
        "Deep potholes on the arterial road are causing two-wheelers to skid.",
        "Our colony road is completely broken with dozens of potholes, urgent repair needed.",
    ],
    "water": [
        "No water supply for the past 3 days. Residents are suffering.",
        "Water coming from taps is yellowish and smells bad, unfit for drinking.",
        "Water pressure is very low, upper floors in apartments get no water at all.",
        "Burst water pipe on main road, water is flooding the street and being wasted.",
        "Our area gets water supply only for 30 minutes a day, completely insufficient.",
        "Water tanker promised by the municipality has not arrived for two weeks.",
        "Contaminated water supply causing stomach illness among residents.",
        "Water meter is broken and we're being charged incorrectly, please fix.",
        "Overhead tank is leaking, entire road is waterlogged due to the leak.",
        "Sewage mixed with drinking water supply, health hazard for all residents.",
    ],
    "sanitation": [
        "Garbage has not been collected for 5 days, overflowing bins attracting rats.",
        "Illegal dumping ground near our apartment is creating a health hazard.",
        "Garbage truck skips our street regularly, piles of waste on the road.",
        "The garbage bin near the park is always overflowing, please increase frequency.",
        "Burning of garbage in open area creating smoke and breathing problems.",
        "Construction debris dumped on public land, blocking pedestrian walkway.",
        "Stray animals rummaging through uncollected garbage, spreading filth.",
    ],
    "electricity": [
        "Street lights on the main road have been off for 2 weeks, very dangerous at night.",
        "Multiple lamp posts in our area are not working, dark and unsafe for residents.",
        "Flickering street light near the hospital entrance is disturbing patients.",
        "Entire stretch of road has no lighting, women feel unsafe walking at night.",
        "Power cuts lasting 6+ hours daily are affecting daily life and businesses.",
        "Solar street lights installed last year are already non-functional.",
        "Transformer has been faulty for a week causing low voltage issues.",
    ],
    "safety": [
        "Street harassment incidents near the bus stand have increased, need police patrol.",
        "Broken boundary wall of the park allows outsiders to trespass at night.",
        "Chain snatching incidents reported thrice this week near the market area.",
        "Uncovered manhole on the main road is a danger to pedestrians and cyclists.",
        "Drug peddling activity spotted near the school premises, urgent action needed.",
        "Dark lane between apartments used for anti-social activities, need CCTV.",
        "Speeding vehicles near the school zone during morning hours, need speed humps.",
    ],
    "transports": [
        "Bus services to our area have been cancelled without any notice.",
        "Auto-rickshaws are overcharging passengers and refusing short trips.",
        "No bus shelter at the main stop, commuters stand in the rain.",
        "The local bus route 42B has not operated in 3 weeks.",
        "Traffic congestion at the main junction is unmanageable during peak hours.",
        "Potholes near the bus depot are damaging vehicles, need urgent repair.",
        "Illegal parking by trucks is blocking the main road causing traffic jams.",
    ],
}


def random_complaint(category: str) -> str:
    return random.choice(COMPLAINT_TEMPLATES[category])


def generate_feedback(n: int = 400) -> list[dict]:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "complaints.csv")

    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return []

    zone_map = {
        "Zone 1": "Zone A",
        "Zone 2": "Zone B",
        "Zone 3": "Zone C",
        "Zone 4": "Zone D",
        "Zone 5": "Zone E",
    }

    category_map = {
        "Water": "water",
        "Roads": "road",
        "Electricity": "electricity",
        "Safety": "safety",
        "Sanitation": "sanitation",
        "Transport": "transports",
    }

    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            date_str = row.get("date", "")
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                dt = dt + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
                submitted_at_str = dt.isoformat()
            except Exception:
                submitted_at_str = datetime.utcnow().isoformat()

            zone = zone_map.get(row.get("zone", ""), "Zone A")
            category_reported = category_map.get(row.get("category", ""), "other")
            status = row.get("status", "new").lower()
            if status == "open":
                status = "new"

            rows.append({
                "submitted_at": submitted_at_str,
                "zone": zone,
                "category_reported": category_reported,
                "description": row.get("text", ""),
                "source": random.choice(SOURCES),
                "status": status,
            })

    random.shuffle(rows)
    return rows


def save_csv(rows: list[dict], path: str = "synthetic_feedback.csv"):
    fieldnames = ["submitted_at", "zone", "category_reported", "description", "source", "status"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Saved {len(rows)} rows to {path}")


if __name__ == "__main__":
    rows = generate_feedback(400)
    save_csv(rows)
    print("Sample row:", rows[0])
