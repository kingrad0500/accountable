"""Every dashboard figure against hand-built data (DB1 to DB7). Today is 18 Nov 2026."""

import pytest

from .conftest import make_activity, make_contact, make_deal, make_org


@pytest.fixture
def data(client):
    org = make_org(client)
    o = org["id"]
    ids = {}
    ids["won_nov"] = make_deal(client, o, name="Won Nov", stage="won", value=10000, close_date="2026-11-05")["id"]
    ids["won_jun"] = make_deal(client, o, name="Won Jun", stage="won", value=20000, close_date="2026-06-10")["id"]
    ids["won_old"] = make_deal(client, o, name="Won old", stage="won", value=5000, close_date="2025-10-01")["id"]
    lost = make_deal(client, o, name="Lost Sep", stage="new", value=8000)["id"]
    client.post(f"/api/deals/{lost}/move", json={"stage": "qualified", "index": 0})
    client.post(f"/api/deals/{lost}/move", json={"stage": "lost", "index": 0})
    client.patch(f"/api/deals/{lost}", json={"close_date": "2026-09-01"})
    ids["late"] = make_deal(client, o, name="Late", stage="proposal", value=30000, close_date="2026-11-10")["id"]
    ids["new"] = make_deal(client, o, name="Fresh", stage="new", value=4000, close_date="2027-01-01")["id"]

    contact = make_contact(client, organization_id=o)
    make_activity(client, contact_id=contact["id"], description="Overdue", follow_up_date="2026-11-15", occurred_at="2026-11-01T10:00:00Z")
    make_activity(client, deal_id=ids["late"], description="Due today", follow_up_date="2026-11-18", occurred_at="2026-11-02T10:00:00Z")
    make_activity(client, contact_id=contact["id"], description="Upcoming", follow_up_date="2026-11-25", occurred_at="2026-11-03T10:00:00Z")
    make_activity(
        client, contact_id=contact["id"], description="Done", follow_up_date="2026-11-01", follow_up_done=True, occurred_at="2026-10-01T10:00:00Z"
    )
    return ids


def dashboard(client):
    return client.get("/api/dashboard").json()


def test_revenue_won_by_month(client, data):
    d = dashboard(client)
    months = {m["month"]: m for m in d["months"]}
    assert list(months)[0] == "2025-12" and list(months)[-1] == "2026-11"
    assert months["2026-11"]["revenue"] == 10000
    assert months["2026-06"]["revenue"] == 20000
    assert sum(m["revenue"] for m in d["months"]) == d["figures"]["revenue_won_12m"] == 30000
    assert d["figures"]["revenue_won_prior_12m"] == 5000


def test_won_and_lost_counts(client, data):
    d = dashboard(client)
    months = {m["month"]: m for m in d["months"]}
    assert (months["2026-11"]["won"], months["2026-06"]["won"], months["2026-09"]["lost"]) == (1, 1, 1)
    assert (d["figures"]["won_12m"], d["figures"]["lost_12m"]) == (2, 1)


def test_open_value_and_expected_revenue(client, data):
    f = dashboard(client)["figures"]
    assert (f["open_value"], f["open_count"], f["expected_revenue"]) == (34000, 2, 15400)


def test_win_rate_and_needs_attention(client, data):
    f = dashboard(client)["figures"]
    assert f["win_rate"] == pytest.approx(2 / 3)
    assert (f["late_deals"], f["overdue_follow_ups"], f["needs_attention"]) == (1, 1, 2)


def test_win_rate_with_nothing_closed(client):
    assert dashboard(client)["figures"]["win_rate"] is None


def test_funnel_uses_stage_history(client, data):
    funnel = dashboard(client)["funnel"]
    assert [(s["stage"], s["value"]) for s in funnel["stages"]] == [
        ("new", 77000),
        ("qualified", 73000),
        ("proposal", 65000),
        ("negotiation", 35000),
        ("won", 35000),
    ]
    assert (funnel["lost_value"], funnel["lost_count"]) == (8000, 1)


def test_recent_activity_is_newest_first(client, data):
    recent = dashboard(client)["recent"]
    assert len(recent) <= 10
    assert [e["at"] for e in recent] == sorted((e["at"] for e in recent), reverse=True)
    # The two stage changes happened "now", after every activity.
    assert [e["kind"] for e in recent[:2]] == ["stage_change", "stage_change"]
    assert recent[0]["to_stage"] == "lost"


def test_follow_ups_are_grouped(client, data):
    d = dashboard(client)
    assert [(f["description"], f["group"]) for f in d["follow_ups"]] == [
        ("Overdue", "overdue"),
        ("Due today", "today"),
        ("Upcoming", "upcoming"),
    ]
    assert d["follow_up_counts"] == {"overdue": 1, "today": 1, "upcoming": 1}
    assert d["follow_ups"][1]["deal_name"] == "Late"


def test_winning_a_deal_and_adding_a_follow_up_change_figures_at_once(client, data):
    client.post(f"/api/deals/{data['late']}/move", json={"stage": "won", "index": 0})
    make_activity(client, deal_id=data["new"], description="Call next week", follow_up_date="2026-11-24")
    d = dashboard(client)
    f = d["figures"]
    assert f["revenue_won_12m"] == 60000
    assert {m["month"]: m for m in d["months"]}["2026-11"]["won"] == 2
    assert f["win_rate"] == pytest.approx(3 / 4)
    assert (f["late_deals"], f["open_value"]) == (0, 4000)
    assert d["follow_up_counts"]["upcoming"] == 2
    assert d["recent"][0]["to_stage"] == "won"


def test_marking_a_follow_up_done_removes_it(client, data):
    d = dashboard(client)
    first = d["follow_ups"][0]
    client.patch(f"/api/activities/{first['id']}", json={"follow_up_done": True})
    after = dashboard(client)
    assert first["id"] not in [f["id"] for f in after["follow_ups"]]
    assert after["figures"]["overdue_follow_ups"] == 0
