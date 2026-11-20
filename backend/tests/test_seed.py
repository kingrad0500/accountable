from collections import Counter
from datetime import date, timedelta

from sqlalchemy import select

from accountable import db
from accountable.dashboard import compute
from accountable.db import activities, contacts, deals, organizations, stage_changes
from accountable.seed import seed

from .conftest import TODAY

OPEN_PATH = ["new", "qualified", "proposal", "negotiation"]


def seeded(conn):
    seed(conn)
    conn.commit()
    return conn


def rows(conn, table):
    return conn.execute(select(table)).all()


def test_counts_and_spread(conn):
    seeded(conn)
    assert 13 <= len(rows(conn, organizations)) <= 17
    assert 36 <= len(rows(conn, contacts)) <= 44
    assert 28 <= len(rows(conn, deals)) <= 36
    assert 70 <= len(rows(conn, activities)) <= 100
    assert len({o.industry for o in rows(conn, organizations)} & {"Software", "Healthcare", "Logistics", "Retail", "Finance", "Manufacturing"}) >= 5
    assert set(Counter(c.status for c in rows(conn, contacts))) == {"lead", "qualified", "customer"}
    assert set(Counter(d.stage for d in rows(conn, deals))) == set(db.STAGES)
    assert all(5000 <= d.value <= 150000 for d in rows(conn, deals))


def test_every_month_has_won_deals_and_three_or_four_are_late(conn):
    seeded(conn)
    d = compute(conn)
    assert all(m["won"] >= 1 for m in d["months"])
    assert any(m["lost"] for m in d["months"])
    assert 3 <= d["figures"]["late_deals"] <= 4
    open_closes = [r.close_date for r in rows(conn, deals) if r.stage in db.OPEN_STAGES]
    assert max(open_closes) <= TODAY + timedelta(days=125)


def test_overdue_today_and_upcoming_follow_ups(conn):
    seeded(conn)
    counts = compute(conn)["follow_up_counts"]
    assert 5 <= counts["overdue"] <= 7
    assert counts["today"] == 2
    assert 7 <= counts["upcoming"] <= 9
    assert all(f["follow_up_date"] <= TODAY + timedelta(days=14) for f in compute(conn)["follow_ups"])


def test_stage_history_fits_each_deal(conn):
    seeded(conn)
    history: dict[int, list] = {}
    for change in sorted(rows(conn, stage_changes), key=lambda c: c.changed_at):
        history.setdefault(change.deal_id, []).append(change)
    for deal in rows(conn, deals):
        steps = history.get(deal.id, [])
        if deal.stage == "new":
            assert steps == []
            continue
        assert steps[-1].to_stage == deal.stage
        assert steps[0].from_stage == "new"
        for before, after in zip(steps, steps[1:]):
            assert before.to_stage == after.from_stage
        if deal.stage in ("won", "lost"):
            assert steps[-1].changed_at.date() == deal.close_date
        assert all(s.changed_at.date() <= TODAY for s in steps)


def snapshot(conn):
    def strip(table):
        return sorted(tuple(v for k, v in r._mapping.items() if k not in ("created_at", "updated_at")) for r in rows(conn, table))

    return [strip(t) for t in db.ALL_TABLES]


def test_seeding_twice_gives_the_same_data_and_resets_changes(conn):
    seeded(conn)
    first = snapshot(conn)
    conn.execute(deals.delete())
    conn.execute(organizations.insert().values(name="Added by hand"))
    conn.commit()
    seeded(conn)
    assert snapshot(conn) == first


def test_dates_are_relative_to_today(conn, monkeypatch):
    seeded(conn)
    before = {r.name: r.close_date for r in rows(conn, deals)}
    monkeypatch.setenv("ACCOUNTABLE_TODAY", (TODAY + timedelta(days=10)).isoformat())
    seeded(conn)
    after = {r.name: r.close_date for r in rows(conn, deals)}
    shifted = [n for n in before if after[n] - before[n] == timedelta(days=10)]
    assert len(shifted) >= 15  # every open deal moves with today
    assert isinstance(next(iter(after.values())), date)
