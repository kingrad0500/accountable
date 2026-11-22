import importlib
from datetime import date

import pytest
from fastapi.testclient import TestClient

from accountable import db, main

from .conftest import field_errors


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_a_missing_value_reads_required(client):
    r = client.post("/api/organizations", json={"name": None})
    assert field_errors(r) == {"name": "Required"}


def test_big_lists_encode_dates_and_refuse_unknown_types():
    body = db.json_response({"day": date(2026, 11, 18)}).body
    assert body == b'{"day":"2026-11-18"}'
    with pytest.raises(TypeError, match="Can't encode object"):
        db.json_response({"thing": object()})


@pytest.fixture
def test_mode_app(monkeypatch):
    """The app as the end-to-end tests start it, with the reset endpoint."""
    monkeypatch.setenv("ACCOUNTABLE_TEST", "1")
    db.create_schema()
    yield importlib.reload(main).app
    monkeypatch.delenv("ACCOUNTABLE_TEST")
    importlib.reload(main)


def test_reset_reloads_the_sample_data_in_test_mode(test_mode_app):
    with TestClient(test_mode_app) as c:
        assert c.get("/api/deals").json() == []
        assert c.post("/api/test/reset").json() == {"status": "reset"}
        assert len(c.get("/api/deals").json()) > 0


def test_there_is_no_reset_outside_test_mode(client):
    assert client.post("/api/test/reset").status_code in (404, 405)
