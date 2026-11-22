import pytest

from .conftest import field_errors, make_activity, make_contact, make_deal, make_org


def test_name_is_required(client):
    assert field_errors(client.post("/api/organizations", json={}))["name"] == "Required"
    assert (
        field_errors(client.post("/api/organizations", json={"name": "   "}))["name"] == "Required"
    )


@pytest.mark.parametrize("website", ["acme.com", "https://acme.com", "http://www.acme.co.uk/about"])
def test_website_that_looks_like_one_is_accepted(client, website):
    assert make_org(client, website=website)["website"] == website


@pytest.mark.parametrize("website", ["acme", "not a site", "https://", "acme.c"])
def test_website_that_does_not_look_like_one_is_refused(client, website):
    errors = field_errors(
        client.post("/api/organizations", json={"name": "Acme", "website": website})
    )
    assert "website" in errors


def test_blank_website_is_fine(client):
    assert make_org(client, website="")["website"] is None


def test_round_trip_and_404(client):
    org = make_org(client, website="acme.com", industry="Software", notes="Big")
    assert client.get(f"/api/organizations/{org['id']}").json()["industry"] == "Software"
    r = client.patch(f"/api/organizations/{org['id']}", json={"name": "Acme Ltd"})
    assert r.json()["name"] == "Acme Ltd"
    assert r.json()["website"] == "acme.com"
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404
    assert client.patch("/api/organizations/999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/organizations/999").status_code == 404


def test_list_has_counts_and_open_value(client):
    org = make_org(client)
    make_org(client, name="Empty")
    make_contact(client, organization_id=org["id"])
    make_contact(client, name="Bo", organization_id=org["id"])
    make_deal(client, org["id"], value=1000, stage="new")
    make_deal(client, org["id"], value=2000, stage="negotiation")
    make_deal(client, org["id"], value=5000, stage="won")
    rows = {r["name"]: r for r in client.get("/api/organizations").json()}
    assert (
        rows["Acme"]["contact_count"],
        rows["Acme"]["open_deal_count"],
        rows["Acme"]["open_value"],
    ) == (2, 2, 3000)
    assert (
        rows["Empty"]["contact_count"],
        rows["Empty"]["open_deal_count"],
        rows["Empty"]["open_value"],
    ) == (0, 0, 0)


def test_delete_keeps_contacts_and_deals(client):
    org = make_org(client)
    contact = make_contact(client, organization_id=org["id"])
    deal = make_deal(client, org["id"])
    make_deal(client, org["id"], name="Second")
    assert client.get(f"/api/organizations/{org['id']}/delete-impact").json() == {
        "contacts": 1,
        "deals": 2,
    }
    client.delete(f"/api/organizations/{org['id']}")
    assert client.get(f"/api/contacts/{contact['id']}").json()["organization_id"] is None
    assert client.get(f"/api/deals/{deal['id']}").json()["organization_id"] is None


def test_timeline_has_contacts_and_deals_activities_and_stage_changes(client):
    org = make_org(client)
    other = make_org(client, name="Other")
    contact = make_contact(client, organization_id=org["id"])
    deal = make_deal(client, org["id"])
    make_activity(
        client,
        contact_id=contact["id"],
        description="On contact",
        occurred_at="2026-11-01T10:00:00Z",
    )
    make_activity(
        client, deal_id=deal["id"], description="On deal", occurred_at="2026-11-05T10:00:00Z"
    )
    make_activity(client, deal_id=make_deal(client, other["id"])["id"], description="Elsewhere")
    client.post(f"/api/deals/{deal['id']}/move", json={"stage": "qualified", "index": 0})

    timeline = client.get(f"/api/organizations/{org['id']}").json()["timeline"]
    assert [e.get("description") or e["kind"] for e in timeline] == [
        "stage_change",
        "On deal",
        "On contact",
    ]
    times = [e["at"] for e in timeline]
    assert times == sorted(times, reverse=True)


def test_an_edit_cannot_clear_the_name(client):
    org = make_org(client)
    r = client.patch(f"/api/organizations/{org['id']}", json={"name": None})
    assert field_errors(r) == {"name": "Required"}


def test_an_edit_can_clear_the_website(client):
    org = make_org(client, website="https://acme.example")
    r = client.patch(f"/api/organizations/{org['id']}", json={"website": None})
    assert r.status_code == 200, r.text
    assert r.json()["website"] is None
