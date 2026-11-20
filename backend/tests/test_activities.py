from .conftest import field_errors, make_activity, make_contact, make_deal, make_org


def test_type_description_and_date_are_required(client):
    contact = make_contact(client)
    errors = field_errors(client.post("/api/activities", json={"contact_id": contact["id"]}))
    assert set(errors) >= {"type", "description", "occurred_at"}
    errors = field_errors(
        client.post(
            "/api/activities",
            json={"contact_id": contact["id"], "type": "call", "description": " ", "occurred_at": "2026-11-01T10:00:00Z"},
        )
    )
    assert errors == {"description": "Required"}


def test_type_must_be_note_call_or_email(client):
    contact = make_contact(client)
    body = {"contact_id": contact["id"], "type": "meeting", "description": "x", "occurred_at": "2026-11-01T10:00:00Z"}
    assert "type" in field_errors(client.post("/api/activities", json=body))


def test_belongs_to_exactly_one_contact_or_deal(client):
    contact = make_contact(client)
    deal = make_deal(client, make_org(client)["id"])
    base = {"type": "note", "description": "x", "occurred_at": "2026-11-01T10:00:00Z"}
    assert client.post("/api/activities", json=base).status_code == 422
    both = {**base, "contact_id": contact["id"], "deal_id": deal["id"]}
    assert client.post("/api/activities", json=both).status_code == 422
    assert client.post("/api/activities", json={**base, "deal_id": 999}).status_code == 422


def test_add_edit_and_delete(client):
    contact = make_contact(client, name="Emma Walsh")
    activity = make_activity(client, contact_id=contact["id"], type="call", occurred_at="2026-11-12T15:30:00+01:00")
    assert activity["occurred_at"] == "2026-11-12T14:30:00Z"
    assert activity["contact_name"] == "Emma Walsh"

    edited = client.patch(f"/api/activities/{activity['id']}", json={"description": "Left a message", "type": "email"})
    assert (edited.json()["description"], edited.json()["type"]) == ("Left a message", "email")
    assert "description" in field_errors(client.patch(f"/api/activities/{activity['id']}", json={"description": ""}))

    assert client.delete(f"/api/activities/{activity['id']}").status_code == 204
    assert client.patch(f"/api/activities/{activity['id']}", json={"type": "note"}).status_code == 404


def test_mark_follow_up_done_and_not_done(client):
    contact = make_contact(client)
    activity = make_activity(client, contact_id=contact["id"], follow_up_date="2026-11-20")
    assert activity["follow_up_done"] is False
    done = client.patch(f"/api/activities/{activity['id']}", json={"follow_up_done": True}).json()
    assert done["follow_up_done"] is True
    undone = client.patch(f"/api/activities/{activity['id']}", json={"follow_up_done": False}).json()
    assert undone["follow_up_done"] is False
