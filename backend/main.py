from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_
from datetime import datetime, timedelta, date
from typing import Optional
import csv
import io
import asyncio

from database import engine, get_db, Base
import models
from models import FeedbackRaw, FeedbackProcessed, ZoneDailyAggregate
from gemini import classify_feedback, parse_nl_query, generate_nl_answer
from synthetic_data import generate_feedback

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Civic Pulse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def compute_priority_score(urgency: int, submitted_at: datetime, zone: str, db: Session) -> float:
    """Priority = urgency (weighted 60%) + recency (20%) + zone density (20%)."""
    now = datetime.utcnow()
    days_old = max(0, (now - submitted_at).days)
    recency = max(0, 10 - days_old * 0.5)  # 10 if today, decays over 20 days

    # Zone complaint density in last 7 days
    week_ago = now - timedelta(days=7)
    density_count = (
        db.query(func.count(FeedbackRaw.id))
        .filter(FeedbackRaw.zone == zone, FeedbackRaw.submitted_at >= week_ago)
        .scalar()
        or 0
    )
    zone_density = min(10, density_count / 5)  # normalize

    priority = urgency * 0.6 + recency * 0.2 + zone_density * 0.2
    return round(priority, 2)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest")
async def ingest(
    file: Optional[UploadFile] = File(None),
    use_synthetic: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Load feedback from CSV upload or generate synthetic data."""
    rows_added = 0

    if use_synthetic or file is None:
        data = generate_feedback(400)
    else:
        content = await file.read()
        reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
        data = list(reader)

    for row in data:
        submitted_at = row.get("submitted_at")
        if isinstance(submitted_at, str):
            try:
                submitted_at = datetime.fromisoformat(submitted_at)
            except ValueError:
                submitted_at = datetime.utcnow()

        fb = FeedbackRaw(
            submitted_at=submitted_at,
            zone=row.get("zone", "Zone A"),
            category_reported=row.get("category_reported") or None,
            description=row.get("description", ""),
            source=row.get("source", "app"),
            status=row.get("status", "new"),
        )
        db.add(fb)
        rows_added += 1

    db.commit()
    return {"inserted": rows_added}


@app.post("/process")
async def process_feedback(
    limit: int = Query(50, description="Max items to process per call"),
    db: Session = Depends(get_db),
):
    """AI-classify unprocessed feedback rows using Gemini."""
    processed_ids = db.query(FeedbackProcessed.feedback_id).subquery()
    unprocessed = (
        db.query(FeedbackRaw)
        .filter(FeedbackRaw.id.notin_(processed_ids))
        .limit(limit)
        .all()
    )

    if not unprocessed:
        return {"processed": 0, "message": "No unprocessed feedback found"}

    # Classify all records in parallel using asyncio.gather to avoid timeouts
    tasks = [classify_feedback(fb.description) for fb in unprocessed]
    classifications = await asyncio.gather(*tasks)

    results = []
    for fb, classification in zip(unprocessed, classifications):
        priority = compute_priority_score(
            classification.get("urgency_score", 5), fb.submitted_at, fb.zone, db
        )
        fp = FeedbackProcessed(
            feedback_id=fb.id,
            category_ai=classification.get("category_ai", "road"),
            sentiment=classification.get("sentiment", "negative"),
            urgency_score=classification.get("urgency_score", 5),
            priority_score=priority,
            reasoning=classification.get("reasoning", ""),
        )
        db.add(fp)
        results.append(fp)

    db.commit()

    # Update aggregates
    await _refresh_aggregates(db)

    return {"processed": len(results)}


async def _refresh_aggregates(db: Session):
    """Recompute zone_daily_aggregates from processed feedback."""
    db.query(ZoneDailyAggregate).delete()

    rows = db.execute(
        text(
            """
        SELECT
            fr.zone,
            DATE(fr.submitted_at) as day,
            fp.category_ai as category,
            COUNT(*) as cnt,
            AVG(fp.urgency_score) as avg_urgency
        FROM feedback_raw fr
        JOIN feedback_processed fp ON fp.feedback_id = fr.id
        GROUP BY fr.zone, DATE(fr.submitted_at), fp.category_ai
        """
        )
    ).fetchall()

    for r in rows:
        agg = ZoneDailyAggregate(
            zone=r.zone,
            date=r.day if isinstance(r.day, date) else datetime.strptime(str(r.day), "%Y-%m-%d").date(),
            category=r.category,
            count=r.cnt,
            avg_urgency=float(r.avg_urgency),
        )
        db.add(agg)

    db.commit()


@app.get("/aggregates")
def get_aggregates(
    zone: Optional[str] = None,
    category: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    q = db.query(ZoneDailyAggregate).filter(ZoneDailyAggregate.date >= since)
    if zone:
        q = q.filter(ZoneDailyAggregate.zone == zone)
    if category:
        q = q.filter(ZoneDailyAggregate.category == category)
    rows = q.all()
    return [
        {
            "zone": r.zone,
            "date": str(r.date),
            "category": r.category,
            "count": r.count,
            "avg_urgency": r.avg_urgency,
        }
        for r in rows
    ]


@app.get("/anomalies")
def get_anomalies(threshold: float = 2.0, db: Session = Depends(get_db)):
    """Detect spikes: current 7-day vs prior 7-day per zone+category."""
    today = date.today()
    current_start = today - timedelta(days=7)
    prior_start = today - timedelta(days=14)
    prior_end = today - timedelta(days=7)

    current = db.execute(
        text(
            """
        SELECT zone, category, SUM(count) as total, AVG(avg_urgency) as avg_urg
        FROM zone_daily_aggregates
        WHERE date >= :start
        GROUP BY zone, category
        """
        ),
        {"start": current_start},
    ).fetchall()

    prior = db.execute(
        text(
            """
        SELECT zone, category, SUM(count) as total
        FROM zone_daily_aggregates
        WHERE date >= :start AND date < :end
        GROUP BY zone, category
        """
        ),
        {"start": prior_start, "end": prior_end},
    ).fetchall()

    prior_map = {(r.zone, r.category): r.total for r in prior}

    anomalies = []
    for r in current:
        key = (r.zone, r.category)
        prior_count = prior_map.get(key, 0)
        if prior_count == 0:
            prior_count = 1  # avoid division by zero; count of 3+ = flagged

        ratio = r.total / prior_count
        if ratio >= threshold or (prior_count <= 1 and r.total >= 5):
            anomalies.append(
                {
                    "zone": r.zone,
                    "category": r.category,
                    "current_count": r.total,
                    "prior_count": prior_map.get(key, 0),
                    "spike_ratio": round(ratio, 2),
                    "avg_urgency": round(r.avg_urg or 0, 1),
                    "severity": "critical" if ratio >= 4 else "high" if ratio >= 2.5 else "medium",
                }
            )

    anomalies.sort(key=lambda x: x["spike_ratio"], reverse=True)
    return anomalies


@app.get("/feedback")
def get_feedback(
    zone: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    min_urgency: Optional[int] = None,
    days: Optional[int] = None,
    sort_by: str = "priority_score",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    q = (
        db.query(FeedbackRaw, FeedbackProcessed)
        .join(FeedbackProcessed, FeedbackProcessed.feedback_id == FeedbackRaw.id)
    )

    if zone:
        q = q.filter(FeedbackRaw.zone == zone)
    if category:
        q = q.filter(FeedbackProcessed.category_ai == category)
    if status:
        q = q.filter(FeedbackRaw.status == status)
    if min_urgency:
        q = q.filter(FeedbackProcessed.urgency_score >= min_urgency)
    if days:
        since = datetime.utcnow() - timedelta(days=days)
        q = q.filter(FeedbackRaw.submitted_at >= since)

    sort_col = {
        "priority_score": FeedbackProcessed.priority_score,
        "urgency_score": FeedbackProcessed.urgency_score,
        "submitted_at": FeedbackRaw.submitted_at,
    }.get(sort_by, FeedbackProcessed.priority_score)

    total = q.count()
    rows = q.order_by(sort_col.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": fb.id,
                "submitted_at": fb.submitted_at.isoformat(),
                "zone": fb.zone,
                "category_reported": fb.category_reported,
                "description": fb.description,
                "source": fb.source,
                "status": fb.status,
                "category_ai": fp.category_ai,
                "sentiment": fp.sentiment,
                "urgency_score": fp.urgency_score,
                "priority_score": fp.priority_score,
                "reasoning": fp.reasoning,
            }
            for fb, fp in rows
        ],
    }


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_feedback = db.query(func.count(FeedbackRaw.id)).scalar()
    total_processed = db.query(func.count(FeedbackProcessed.id)).scalar()
    avg_urgency = db.query(func.avg(FeedbackProcessed.urgency_score)).scalar()

    # Category breakdown
    cat_breakdown = (
        db.query(FeedbackProcessed.category_ai, func.count(FeedbackProcessed.id))
        .group_by(FeedbackProcessed.category_ai)
        .all()
    )

    # Zone breakdown
    zone_breakdown = (
        db.query(FeedbackRaw.zone, func.count(FeedbackRaw.id))
        .join(FeedbackProcessed, FeedbackProcessed.feedback_id == FeedbackRaw.id)
        .group_by(FeedbackRaw.zone)
        .all()
    )

    high_urgency = (
        db.query(func.count(FeedbackProcessed.id))
        .filter(FeedbackProcessed.urgency_score >= 8)
        .scalar()
    )

    return {
        "total_feedback": total_feedback,
        "total_processed": total_processed,
        "avg_urgency": round(float(avg_urgency or 0), 1),
        "high_urgency_count": high_urgency,
        "category_breakdown": [{"category": c, "count": n} for c, n in cat_breakdown],
        "zone_breakdown": [{"zone": z, "count": n} for z, n in zone_breakdown],
    }


@app.post("/ask")
async def ask(payload: dict, db: Session = Depends(get_db)):
    """Natural language query interface."""
    question = payload.get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # Step 1: Parse intent
    intent_data = await parse_nl_query(question)

    if not intent_data.get("answerable", True):
        return {
            "answer": "I don't have enough data to answer that question. Please ask about civic feedback categories like road, water, sanitation, electricity, safety, or transport.",
            "data": [],
            "intent": intent_data,
        }

    # Step 2: Build query from intent
    q = (
        db.query(FeedbackRaw, FeedbackProcessed)
        .join(FeedbackProcessed, FeedbackProcessed.feedback_id == FeedbackRaw.id)
    )

    zone = intent_data.get("zone")
    category = intent_data.get("category")
    time_range = intent_data.get("time_range", "last_30_days")
    sort_by = intent_data.get("sort_by", "urgency_score")
    limit = min(int(intent_data.get("limit", 10)), 20)

    if zone and zone.lower() not in ["all", "none", "null"]:
        q = q.filter(FeedbackRaw.zone == zone)
    if category and category.lower() not in ["all", "none", "null"]:
        q = q.filter(FeedbackProcessed.category_ai == category)

    now = datetime.utcnow()
    time_map = {
        "today": timedelta(days=1),
        "this_week": timedelta(days=7),
        "last_week": timedelta(days=14),
        "this_month": timedelta(days=30),
        "last_30_days": timedelta(days=30),
        "last_60_days": timedelta(days=60),
    }
    if time_range != "all_time" and time_range in time_map:
        q = q.filter(FeedbackRaw.submitted_at >= now - time_map[time_range])

    sort_col = {
        "urgency_score": FeedbackProcessed.urgency_score,
        "priority_score": FeedbackProcessed.priority_score,
        "submitted_at": FeedbackRaw.submitted_at,
    }.get(sort_by, FeedbackProcessed.urgency_score)

    rows = q.order_by(sort_col.desc()).limit(limit).all()

    data = [
        {
            "id": fb.id,
            "zone": fb.zone,
            "submitted_at": fb.submitted_at.isoformat(),
            "category_ai": fp.category_ai,
            "urgency_score": fp.urgency_score,
            "priority_score": fp.priority_score,
            "description": fb.description[:150],
            "status": fb.status,
        }
        for fb, fp in rows
    ]

    # Step 3: Generate NL answer
    answer = await generate_nl_answer(question, intent_data.get("intent", ""), data)

    return {"answer": answer, "data": data, "intent": intent_data}
