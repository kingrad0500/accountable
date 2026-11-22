from datetime import date

import pytest

from accountable.deals import is_late

from .conftest import TODAY, field_errors, make_activity, make_contact, make_deal, make_org


@pytest.fixture
def org(client):
    return make_org(client)


def get(client, deal_id):
    return client.get(f"/api/deals/{deal_id}").json()


def move(client, deal_id, stage, index):
    r = client.post(f"/api/deals/{deal_id}/move", json={"stage": stage, "index": index})
    assert r.status_code == 200, r.text
    return r.json()


def column(client, stage):
    deals = [d for d in client.get("/api/deals").json() if d["stage"] == stage]
    return [d["name"] for d in sorted(deals, key=lambda d: d["position"])]


def positions(client, stage):
    return sorted(d["position"] for d in client.get("/api/deals").json() if d["stage"] == stage)


# ---- Validation (V1, V3, V5) ----


def test_required_fields(client):
    assert set(field_errors(client.post("/api/deals", json={}))) == {"name", "organization_id", "stage", "value"}


def test_negative_value_and_bad_probability_are_refused(client, org):
    base = {"name": "X", "organization_id": org["id"], "stage": "new"}
    assert field_errors(client.post("/api/deals", json={**base, "value": -1})) == {"value": "Must be 0 or more"}
    assert field_errors(client.post("/api/deals", json={**base, "value": 1.5})) == {"value": "Enter a whole number"}
    assert "probability" in field_errors(client.post("/api/deals", json={**base, "value": 1, "probability": 101}))
    assert "probability" in field_errors(client.post("/api/deals", json={**base, "value": 1, "probability": -1}))
    assert "stage" in field_errors(client.post("/api/deals", json={**base, "value": 1, "stage": "done"}))


def test_unknown_organization_or_contact_is_refused(client, org):
    base = {"name": "X", "stage": "new", "value": 1}
    assert "organization_id" in field_errors(client.post("/api/deals", json={**base, "organization_id": 999}))
    body = {**base, "organization_id": org["id"], "main_contact_id": 999}
    assert "main_contact_id" in field_errors(client.post("/api/deals", json=body))


def test_round_trip_and_list_names(client, org):
    contact = make_contact(client, name="Grace Fischer")
    deal = make_deal(client, org["id"], main_contact_id=contact["id"], close_date="2026-12-01")
    [row] = client.get("/api/deals").json()
    assert (row["organization_name"], row["main_contact_name"], row["close_date"]) == ("Acme", "Grace Fischer", "2026-12-01")
    assert client.patch(f"/api/deals/{deal['id']}", json={"value": 12000}).json()["value"] == 12000
    assert client.get("/api/deals/999").status_code == 404


# ---- Stage rules (DL5, DL6) ----


def test_new_deal_starts_at_its_stages_probability(client, org):
    assert make_deal(client, org["id"], stage="proposal")["probability"] == 50
    assert make_deal(client, org["id"], stage="proposal", probability=65)["probability"] == 65


@pytest.mark.parametrize(
    "stage,probability", [("new", 10), ("qualified", 25), ("proposal", 50), ("negotiation", 75), ("won", 100), ("lost", 0)]
)
def test_each_stage_change_sets_its_probability(client, org, stage, probability):
    deal = make_deal(client, org["id"], stage="qualified" if stage == "new" else "new")
    assert move(client, deal["id"], stage, 0)["probability"] == probability


def test_hand_set_probability_is_kept_until_the_next_stage_change(client, org):
    deal = make_deal(client, org["id"], stage="proposal")
    assert client.patch(f"/api/deals/{deal['id']}", json={"probability": 65}).json()["probability"] == 65
    assert client.patch(f"/api/deals/{deal['id']}", json={"name": "Renamed"}).json()["probability"] == 65
    assert move(client, deal["id"], "proposal", 0)["probability"] == 65  # same column: no change
    assert move(client, deal["id"], "negotiation", 0)["probability"] == 75


def test_won_and_lost_set_todays_close_date(client, org):
    won = make_deal(client, org["id"], close_date="2027-03-01")
    lost = make_deal(client, org["id"], name="L", close_date="2027-03-01")
    assert move(client, won["id"], "won", 0)["close_date"] == TODAY.isoformat()
    edited = client.patch(f"/api/deals/{lost['id']}", json={"stage": "lost"}).json()
    assert edited["close_date"] == TODAY.isoformat()


def test_deal_moved_out_of_won_keeps_its_close_date_and_may_be_late(client, org):
    deal = make_deal(client, org["id"], stage="won", close_date="2026-10-01")
    reopened = move(client, deal["id"], "negotiation", 0)
    assert reopened["close_date"] == "2026-10-01"
    assert reopened["is_late"] is True


def test_users_values_win_when_an_edit_changes_stage_too(client, org):
    deal = make_deal(client, org["id"], stage="proposal", close_date="2027-01-01")
    edited = client.patch(
        f"/api/deals/{deal['id']}", json={"stage": "won", "probability": 90, "close_date": "2026-11-01"}
    ).json()
    assert (edited["stage"], edited["probability"], edited["close_date"]) == ("won", 90, "2026-11-01")


def test_unchanged_values_sent_by_the_form_do_not_block_the_defaults(client, org):
    deal = make_deal(client, org["id"], stage="proposal", close_date="2027-01-01")
    body = {"name": deal["name"], "stage": "won", "probability": 50, "close_date": "2027-01-01", "value": deal["value"]}
    edited = client.patch(f"/api/deals/{deal['id']}", json=body).json()
    assert (edited["probability"], edited["close_date"]) == (100, TODAY.isoformat())


def test_every_change_writes_one_entry(client, org):
    deal = make_deal(client, org["id"], stage="proposal")
    move(client, deal["id"], "negotiation", 0)
    move(client, deal["id"], "negotiation", 0)
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "won"})
    client.patch(f"/api/deals/{deal['id']}", json={"value": 5})
    entries = [e for e in get(client, deal["id"])["timeline"] if e["kind"] == "stage_change"]
    assert [(e["from_stage"], e["to_stage"]) for e in entries] == [("negotiation", "won"), ("proposal", "negotiation")]


def test_is_late_only_for_open_deals_past_their_close_date():
    past, future = date(2026, 11, 1), date(2026, 12, 1)
    assert is_late("proposal", past, TODAY)
    assert not is_late("proposal", future, TODAY)
    assert not is_late("proposal", TODAY, TODAY)
    assert not is_late("proposal", None, TODAY)
    assert not is_late("won", past, TODAY)
    assert not is_late("lost", past, TODAY)


# ---- Board ordering (P2, P4) ----


@pytest.fixture
def board(client, org):
    """New: A B C (top to bottom). Qualified: X Y Z. Proposal: empty."""
    for name in ["C", "B", "A"]:
        make_deal(client, org["id"], name=name, stage="new")
    for name in ["Z", "Y", "X"]:
        make_deal(client, org["id"], name=name, stage="qualified")
    ids = {d["name"]: d["id"] for d in client.get("/api/deals").json()}
    assert column(client, "new") == ["A", "B", "C"]
    return ids


@pytest.mark.parametrize("index,expected", [(0, ["A", "X", "Y", "Z"]), (2, ["X", "Y", "A", "Z"]), (3, ["X", "Y", "Z", "A"]), (99, ["X", "Y", "Z", "A"])])
def test_move_to_another_column(client, board, index, expected):
    move(client, board["A"], "qualified", index)
    assert column(client, "qualified") == expected
    assert column(client, "new") == ["B", "C"]
    assert positions(client, "qualified") == [0, 1, 2, 3]
    assert positions(client, "new") == [0, 1]


def test_move_within_a_column_down_and_up(client, board):
    move(client, board["A"], "new", 2)
    assert column(client, "new") == ["B", "C", "A"]
    move(client, board["C"], "new", 0)
    assert column(client, "new") == ["C", "B", "A"]
    move(client, board["B"], "new", 1)
    assert column(client, "new") == ["C", "B", "A"]
    assert positions(client, "new") == [0, 1, 2]


def test_move_into_an_empty_column(client, board):
    move(client, board["B"], "proposal", 0)
    assert column(client, "proposal") == ["B"]
    assert positions(client, "proposal") == [0]
    assert column(client, "new") == ["A", "C"]


def test_new_deals_take_position_zero(client, board, org):
    make_deal(client, org["id"], name="Fresh", stage="new")
    assert column(client, "new") == ["Fresh", "A", "B", "C"]
    assert positions(client, "new") == [0, 1, 2, 3]


def test_stage_change_from_the_form_puts_the_deal_on_top(client, board):
    client.patch(f"/api/deals/{board['C']}", json={"stage": "qualified"})
    assert column(client, "qualified") == ["C", "X", "Y", "Z"]
    assert positions(client, "new") == [0, 1]


def test_move_validation(client, board):
    assert client.post(f"/api/deals/{board['A']}/move", json={"stage": "nope", "index": 0}).status_code == 422
    assert client.post(f"/api/deals/{board['A']}/move", json={"stage": "new", "index": -1}).status_code == 422
    assert client.post("/api/deals/999/move", json={"stage": "new", "index": 0}).status_code == 404


# ---- Delete (D1) ----


def test_delete_removes_activities_and_stage_history(client, org):
    deal = make_deal(client, org["id"])
    make_activity(client, deal_id=deal["id"])
    make_activity(client, deal_id=deal["id"])
    move(client, deal["id"], "qualified", 0)
    assert client.get(f"/api/deals/{deal['id']}/delete-impact").json() == {"activities": 2, "stage_changes": 1}
    assert client.delete(f"/api/deals/{deal['id']}").status_code == 204
    assert client.get("/api/dashboard").json()["recent"] == []


# ---- No organization (concern 3) ----


def test_deal_without_organization_can_move_but_form_save_asks_for_one(client, org):
    deal = make_deal(client, org["id"])
    client.delete(f"/api/organizations/{org['id']}")
    assert move(client, deal["id"], "qualified", 0)["stage"] == "qualified"
    assert field_errors(client.patch(f"/api/deals/{deal['id']}", json={"name": "Renamed"})) == {"organization_id": "Required"}
    other = make_org(client, name="New home")
    fixed = client.patch(f"/api/deals/{deal['id']}", json={"organization_id": other["id"]}).json()
    assert fixed["organization_name"] == "New home"


# ---- Timeline (DL3) ----


def test_timeline_has_activities_and_stage_changes(client, org):
    deal = make_deal(client, org["id"])
    make_activity(client, deal_id=deal["id"], description="First call", occurred_at="2026-10-01T10:00:00Z")
    move(client, deal["id"], "qualified", 0)
    timeline = get(client, deal["id"])["timeline"]
    assert [e["kind"] for e in timeline] == ["stage_change", "activity"]
    assert timeline[0]["deal_name"] == "Website rebuild"


def test_list_json_keeps_iso_dates_and_utc_times(client, org):
    make_deal(client, org["id"], close_date="2026-12-01")
    [row] = client.get("/api/deals").json()
    assert row["close_date"] == "2026-12-01"
    assert row["created_at"].endswith("Z") and "T" in row["created_at"]
    assert client.get("/api/deals").headers["content-type"] == "application/json"
