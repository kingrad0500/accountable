"""The dashboard: every figure in one response, computed from the database at request time (DB7)."""

from collections import defaultdict
from datetime import date
from typing import TypedDict

from fastapi import APIRouter
from sqlalchemy import Connection, and_, func, select

from . import config, db
from .activities import activity_entry, activity_query, timeline
from .db import OPEN_STAGES, activities, deals, stage_changes
from .deals import is_late

router = APIRouter(tags=["dashboard"])

FUNNEL_STAGES = ("new", "qualified", "proposal", "negotiation", "won")


def month_start(day: date, back: int = 0) -> date:
    """The first day of the month `back` months before `day`'s month."""
    index = day.year * 12 + (day.month - 1) - back
    return date(index // 12, index % 12 + 1, 1)


def follow_up_group(due: date, today: date) -> str:
    if due < today:
        return "overdue"
    if due == today:
        return "today"
    return "upcoming"


class MonthFigures(TypedDict):
    month: str
    revenue: int
    won: int
    lost: int


def furthest_stage(stage: str, history: list[tuple[str, str]]) -> int:
    """Index in FUNNEL_STAGES of the furthest stage a deal reached (concern 6).

    A deal counts toward every stage up to that one, so a deal created at Proposal has
    passed New and Qualified, and a Lost deal counts toward the stages it reached first.
    """
    reached = [stage, *(s for pair in history for s in pair)]
    return max((FUNNEL_STAGES.index(s) for s in reached if s in FUNNEL_STAGES), default=0)


def compute(conn: Connection) -> dict:
    today = config.today()
    months = [month_start(today, back) for back in range(11, -1, -1)]
    first = months[0]
    prior_first = month_start(today, 23)

    rows = conn.execute(
        select(deals.c.id, deals.c.stage, deals.c.value, deals.c.probability, deals.c.close_date)
    ).all()
    history: dict[int, list[tuple[str, str]]] = defaultdict(list)
    for deal_id, from_stage, to_stage in conn.execute(
        select(stage_changes.c.deal_id, stage_changes.c.from_stage, stage_changes.c.to_stage)
    ):
        history[deal_id].append((from_stage, to_stage))

    by_month: dict[date, MonthFigures] = {
        m: {"month": m.strftime("%Y-%m"), "revenue": 0, "won": 0, "lost": 0} for m in months
    }
    open_value = expected = open_count = late = 0
    won_12 = lost_12 = 0
    revenue_prior = 0
    funnel = [0] * len(FUNNEL_STAGES)
    funnel_count = [0] * len(FUNNEL_STAGES)
    lost_value = lost_count = 0

    for d in rows:
        if d.stage in OPEN_STAGES:
            open_count += 1
            open_value += d.value
            expected += d.value * d.probability / 100
            late += is_late(d.stage, d.close_date, today)
        elif d.close_date is not None:
            bucket = (
                by_month.get(month_start(d.close_date)) if first <= d.close_date <= today else None
            )
            if bucket is not None:
                if d.stage == "won":
                    bucket["revenue"] += d.value
                    bucket["won"] += 1
                    won_12 += 1
                else:
                    bucket["lost"] += 1
                    lost_12 += 1
            elif d.stage == "won" and prior_first <= d.close_date < first:
                revenue_prior += d.value
        for i in range(furthest_stage(d.stage, history[d.id]) + 1):
            funnel[i] += d.value
            funnel_count[i] += 1
        if d.stage == "lost":
            lost_value += d.value
            lost_count += 1

    revenue_12 = sum(b["revenue"] for b in by_month.values())
    overdue = conn.execute(
        select(func.count()).where(
            activities.c.follow_up_date < today, activities.c.follow_up_done.is_(False)
        )
    ).scalar_one()

    follow_ups = []
    counts = {"overdue": 0, "today": 0, "upcoming": 0}
    q = (
        activity_query()
        .where(
            and_(activities.c.follow_up_date.is_not(None), activities.c.follow_up_done.is_(False))
        )
        .order_by(activities.c.follow_up_date, activities.c.occurred_at, activities.c.id)
    )
    for r in conn.execute(q):
        entry = activity_entry(r)
        entry["group"] = follow_up_group(entry["follow_up_date"], today)
        counts[entry["group"]] += 1
        follow_ups.append(entry)

    return {
        "today": today,
        "figures": {
            "revenue_won_12m": revenue_12,
            "revenue_won_prior_12m": revenue_prior,
            "open_value": open_value,
            "open_count": open_count,
            "expected_revenue": round(expected),
            "won_12m": won_12,
            "lost_12m": lost_12,
            "win_rate": won_12 / (won_12 + lost_12) if won_12 + lost_12 else None,
            "late_deals": late,
            "overdue_follow_ups": overdue,
            "needs_attention": late + overdue,
        },
        "months": list(by_month.values()),
        "funnel": {
            "stages": [
                {"stage": s, "value": funnel[i], "count": funnel_count[i]}
                for i, s in enumerate(FUNNEL_STAGES)
            ],
            "lost_value": lost_value,
            "lost_count": lost_count,
        },
        "recent": timeline(
            conn, activities.c.id.is_not(None), stage_changes.c.id.is_not(None), limit=10
        ),
        "follow_ups": follow_ups,
        "follow_up_counts": counts,
    }


@router.get("/dashboard")
def dashboard(conn: db.Conn) -> dict:
    return compute(conn)
