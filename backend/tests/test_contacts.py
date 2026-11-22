import pytest

from .conftest import field_errors, make_activity, make_contact, make_deal, make_org


def test_name_is_required(client):
    assert field_errors(client.post("/api/contacts", json={"name": ""}))["name"] == "Required"


@pytest.mark.parametrize("email", ["ana@acme.com", "ana.ruiz+crm@mail.acme.co.uk"])
def test_email_that_looks_like_one_is_accepted(client, email):
    assert make_contact(client, email=email)["email"] == email


@pytest.mark.parametrize("email", ["ana", "ana@", "ana@acme", "ana @acme.com"])
def test_email_that_does_not_look_like_one_is_refused(client, email):
    assert "email" in field_errors(
        client.post("/api/contacts", json={"name": "Ana", "email": email})
    )


def test_status_must_be_known(client):
    assert "status" in field_errors(
        client.post("/api/contacts", json={"name": "Ana", "status": "vip"})
    )


def test_round_trip_and_list_has_organization_name(client):
    org = make_org(client, name="Cedar Health Group")
    contact = make_contact(client, organization_id=org["id"], status="customer", job_title="CIO")
    assert contact["status"] == "customer"
    [row] = client.get("/api/contacts").json()
    assert row["organization_name"] == "Cedar Health Group"
    updated = client.patch(
        f"/api/contacts/{contact['id']}", json={"status": "qualified", "phone": "555"}
    ).json()
    assert (updated["status"], updated["phone"], updated["job_title"]) == (
        "qualified",
        "555",
        "CIO",
    )
    assert client.delete(f"/api/contacts/{contact['id']}").status_code == 204
    assert client.get(f"/api/contacts/{contact['id']}").status_code == 404


def test_new_contact_is_a_lead_by_default(client):
    assert make_contact(client)["status"] == "lead"


def test_unknown_organization_is_refused(client):
    assert "organization_id" in field_errors(
        client.post("/api/contacts", json={"name": "A", "organization_id": 99})
    )


def test_delete_removes_activities_and_keeps_deals(client):
    org = make_org(client)
    contact = make_contact(client)
    deal = make_deal(client, org["id"], main_contact_id=contact["id"])
    make_deal(client, org["id"], name="Two", main_contact_id=contact["id"])
    for _ in range(3):
        make_activity(client, contact_id=contact["id"])
    deal_activity = make_activity(client, deal_id=deal["id"])
    assert client.get(f"/api/contacts/{contact['id']}/delete-impact").json() == {
        "activities": 3,
        "deals": 2,
    }

    client.delete(f"/api/contacts/{contact['id']}")
    kept = client.get(f"/api/deals/{deal['id']}").json()
    assert kept["main_contact_id"] is None
    # Activities on the deal itself stay with the deal.
    assert [e["id"] for e in kept["timeline"] if e["kind"] == "activity"] == [deal_activity["id"]]


def test_timeline_has_own_and_main_contact_deal_activities(client):
    org = make_org(client)
    contact = make_contact(client)
    deal = make_deal(client, org["id"], main_contact_id=contact["id"])
    other_deal = make_deal(client, org["id"], name="Not theirs")
    make_activity(
        client, contact_id=contact["id"], description="Own", occurred_at="2026-11-01T09:00:00Z"
    )
    make_activity(
        client, deal_id=deal["id"], description="On their deal", occurred_at="2026-11-03T09:00:00Z"
    )
    make_activity(client, deal_id=other_deal["id"], description="Not theirs")
    client.post(f"/api/deals/{deal['id']}/move", json={"stage": "won", "index": 0})

    detail = client.get(f"/api/contacts/{contact['id']}").json()
    # Stage changes don't appear on the contact timeline (concern 9).
    assert [e["description"] for e in detail["timeline"]] == ["On their deal", "Own"]
    assert [d["name"] for d in detail["deals"]] == ["Website rebuild"]


def test_deal_activities_follow_the_current_main_contact(client):
    org = make_org(client)
    first = make_contact(client, name="First")
    second = make_contact(client, name="Second")
    deal = make_deal(client, org["id"], main_contact_id=first["id"])
    make_activity(client, deal_id=deal["id"], description="Call")

    client.patch(f"/api/deals/{deal['id']}", json={"main_contact_id": second["id"]})
    assert client.get(f"/api/contacts/{first['id']}").json()["timeline"] == []
    assert [
        e["description"] for e in client.get(f"/api/contacts/{second['id']}").json()["timeline"]
    ] == ["Call"]


def test_an_edit_cannot_clear_the_name(client):
    contact = make_contact(client)
    r = client.patch(f"/api/contacts/{contact['id']}", json={"name": None})
    assert field_errors(r) == {"name": "Required"}
