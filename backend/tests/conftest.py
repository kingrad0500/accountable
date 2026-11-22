"""Every test gets its own temporary database, and "today" is fixed at 18 Nov 2026.

A guard refuses to run against data/accountable.db, so tests never touch real data.
"""

from collections.abc import Iterator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection

from accountable import config, db

TODAY = date(2026, 11, 18)


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch) -> Iterator:
    path = tmp_path / "test.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", TODAY.isoformat())
    if config.db_path() == config.DEFAULT_DB.resolve():
        pytest.exit("Refusing to run tests against data/accountable.db", returncode=2)
    db.dispose_engine()
    yield path
    db.dispose_engine()


@pytest.fixture
def conn() -> Iterator[Connection]:
    db.create_schema()
    with db.get_engine().connect() as c:
        yield c


@pytest.fixture
def client() -> Iterator[TestClient]:
    """An app on an empty database (the schema exists, so startup doesn't seed)."""
    from accountable.main import app

    db.create_schema()
    with TestClient(app) as c:
        yield c


# ---- Helpers for building data through the API ------------------------------


def make_org(client: TestClient, **fields) -> dict:
    r = client.post("/api/organizations", json={"name": "Acme", **fields})
    assert r.status_code == 201, r.text
    return r.json()


def make_contact(client: TestClient, **fields) -> dict:
    r = client.post("/api/contacts", json={"name": "Ana Ruiz", **fields})
    assert r.status_code == 201, r.text
    return r.json()


def make_deal(client: TestClient, organization_id: int, **fields) -> dict:
    body = {
        "name": "Website rebuild",
        "organization_id": organization_id,
        "stage": "new",
        "value": 10000,
        **fields,
    }
    r = client.post("/api/deals", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def make_activity(client: TestClient, **fields) -> dict:
    body = {
        "type": "note",
        "description": "Spoke to them",
        "occurred_at": "2026-11-10T10:00:00Z",
        **fields,
    }
    r = client.post("/api/activities", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def field_errors(response) -> dict[str, str]:
    """{field: message} from a 422 response."""
    assert response.status_code == 422, response.text
    return {e["loc"][-1]: e["msg"] for e in response.json()["detail"]}
