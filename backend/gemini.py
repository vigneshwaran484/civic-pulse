import httpx
import json
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


async def call_gemini(prompt: str, is_json: bool = True) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    generation_config = {
        "temperature": 0.1,
        "maxOutputTokens": 1024
    }
    if is_json:
        generation_config["responseMimeType"] = "application/json"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": generation_config,
    }

    for attempt in range(4):
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload
            )
            if response.status_code == 429:
                wait = 2 ** attempt  # 1s, 2s, 4s, 8s
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    raise Exception("Rate limit exceeded after retries")


def extract_json(text: str) -> dict:
    """Extract JSON from Gemini response, handling markdown code blocks."""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return json.loads(text)


CLASSIFICATION_PROMPT = """You are an AI classifier for civic feedback. Analyze the following citizen complaint and return ONLY valid JSON with no additional text.

Complaint: "{description}"

Return this exact JSON structure:
{{
  "category_ai": "<one of: road, water, sanitation, electricity, safety, transports>",
  "sentiment": "<one of: negative, neutral, positive>",
  "urgency_score": <integer 1-10 where 10 is most urgent>,
  "reasoning": "<one short sentence explaining urgency score>"
}}"""


async def classify_feedback(description: str) -> dict:
    prompt = CLASSIFICATION_PROMPT.format(description=description)
    for attempt in range(2):
        try:
            raw = await call_gemini(prompt)
            return extract_json(raw)
        except Exception as e:
            if attempt == 1:
                return {
                    "category_ai": "road",
                    "sentiment": "negative",
                    "urgency_score": 5,
                    "reasoning": f"Fallback classification due to error: {str(e)[:50]}",
                }
    return {
        "category_ai": "road",
        "sentiment": "negative",
        "urgency_score": 5,
        "reasoning": "Fallback classification",
    }


NL_QUERY_PROMPT = """You are a civic data analyst AI. Parse the user's question about civic feedback data into a structured query intent.

Question: "{question}"

Available zones: Zone A, Zone B, Zone C, Zone D, Zone E, Zone F
Available categories: road, water, sanitation, electricity, safety, transports
Available time ranges: today, this_week, last_week, this_month, last_30_days, last_60_days, all_time

Return ONLY valid JSON with no additional text:
{{
  "zone": "<zone name or null for all zones>",
  "category": "<category or null for all categories>",
  "time_range": "<one of the time range options above>",
  "sort_by": "<one of: urgency_score, priority_score, submitted_at>",
  "limit": <integer 1-20>,
  "intent": "<brief description of what the user wants>",
  "answerable": <true if question can be answered from civic feedback data, false otherwise>
}}"""

NL_ANSWER_PROMPT = """You are a civic analyst giving a concise briefing to a city administrator.

Question asked: "{question}"
Query intent: {intent}
Data results (JSON): {data}

Write a clear, direct 2-4 sentence answer summarizing the key findings. Be specific with numbers and zones.
If there are urgent issues, highlight them. Keep it factual and actionable.
Return ONLY the answer text, no JSON."""


async def parse_nl_query(question: str) -> dict:
    prompt = NL_QUERY_PROMPT.format(question=question)
    for attempt in range(2):
        try:
            raw = await call_gemini(prompt)
            return extract_json(raw)
        except Exception as e:
            if attempt == 1:
                return {
                    "zone": None,
                    "category": None,
                    "time_range": "last_30_days",
                    "sort_by": "urgency_score",
                    "limit": 10,
                    "intent": "general query",
                    "answerable": True,
                }


async def generate_nl_answer(question: str, intent: str, data: list) -> str:
    if not data:
        return "I don't have enough data to answer that question. Try broadening your search criteria or checking a different time range."

    prompt = NL_ANSWER_PROMPT.format(
        question=question,
        intent=intent,
        data=json.dumps(data[:20], default=str),
    )
    try:
        return await call_gemini(prompt, is_json=False)
    except Exception as e:
        # Build a readable fallback instead of raw JSON
        top = data[0] if data else {}
        zones = list({d.get("zone", "") for d in data if d.get("zone")})
        cats = list({d.get("category_ai", "") for d in data if d.get("category_ai")})
        urgencies = [d.get("urgency_score", 0) for d in data]
        avg_urg = round(sum(urgencies) / len(urgencies), 1) if urgencies else 0
        max_urg = max(urgencies) if urgencies else 0
        return (
            f"Found {len(data)} matching complaint(s) across {len(zones)} zone(s) "
            f"({', '.join(sorted(zones)[:3])}). "
            f"Categories: {', '.join(sorted(set(cats)))}. "
            f"Average urgency: {avg_urg}/10, highest: {max_urg}/10. "
            f"Top complaint: \"{top.get('description', '')[:100]}...\" in {top.get('zone', 'N/A')} ({top.get('status', 'new')})."
        )
