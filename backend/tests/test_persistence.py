from fastapi.testclient import TestClient

from accountable import config, db

from .conftest import make_org


def test_a_change_survives_closing_and_reopening(client):
    org = make_org(client, name="Kept")
    db.dispose_engine()
    from accountable.main import app

    with TestClient(app) as again:
        assert again.get(f"/api/organizations/{org['id']}").json()["name"] == "Kept"


def test_a_new_database_is_created_and_seeded_on_startup(isolated_db):
    from accountable.main import app

    assert not isolated_db.exists()
    with TestClient(app) as c:
        assert isolated_db.exists()
        assert len(c.get("/api/deals").json()) >= 28


def test_an_existing_database_is_not_reseeded(client):
    assert client.get("/api/deals").json() == []


def test_tests_never_use_the_real_database(isolated_db):
    assert config.db_path() == isolated_db.resolve()
    assert config.db_path() != config.DEFAULT_DB
    assert "data/accountable.db" not in str(db.get_engine().url).replace("\\", "/")
