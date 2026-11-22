"""With the large dataset, list, timeline and dashboard endpoints answer in under 200 ms (G7)."""

import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from accountable import db
from accountable.seed import seed


@pytest.fixture(scope="module")
def large_client(tmp_path_factory):
    import os

    path = tmp_path_factory.mktemp("large") / "large.db"
    old = {k: os.environ.get(k) for k in ("ACCOUNTABLE_DB", "ACCOUNTABLE_TODAY")}
    os.environ["ACCOUNTABLE_DB"] = str(path)
    os.environ["ACCOUNTABLE_TODAY"] = "2026-11-18"
    db.dispose_engine()
    db.create_schema()
    with db.get_engine().begin() as conn:
        seed(conn, large=True)
    from accountable.main import app

    with TestClient(app) as c:
        yield c
    db.dispose_engine()
    for k, v in old.items():
        os.environ.pop(k, None) if v is None else os.environ.__setitem__(k, v)


@pytest.fixture(autouse=True)
def isolated_db():  # use the module's large database instead of a fresh one
    yield


def timed(client, url):
    client.get(url)  # warm up
    best = min(_once(client, url) for _ in range(3))
    return best


def _once(client, url):
    start = time.perf_counter()
    r = client.get(url)
    assert r.status_code == 200
    return (time.perf_counter() - start) * 1000


def test_large_dataset_sizes(large_client):
    with db.get_engine().connect() as conn:
        count = lambda t: conn.execute(select(func.count()).select_from(t)).scalar_one()
        assert count(db.deals) == 3000
        assert count(db.contacts) == 3000
        assert count(db.activities) == 10000


@pytest.mark.parametrize(
    "url",
    [
        "/api/deals",
        "/api/contacts",
        "/api/organizations",
        "/api/dashboard",
        "/api/organizations/1",
        "/api/contacts/1",
        "/api/deals/1",
    ],
)
def test_endpoint_is_fast(large_client, url):
    assert timed(large_client, url) < 200, url
