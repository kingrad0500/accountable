"""Settings read from the environment.

- ACCOUNTABLE_DB: path of the SQLite file (default data/accountable.db at the repo root)
- ACCOUNTABLE_TODAY: fixes "today" as YYYY-MM-DD, for tests

Later the Supabase URL and keys go here.
"""

import os
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = ROOT / "data" / "accountable.db"


def db_path() -> Path:
    value = os.environ.get("ACCOUNTABLE_DB")
    return Path(value).resolve() if value else DEFAULT_DB


def today() -> date:
    """The computer's local date, or ACCOUNTABLE_TODAY when set."""
    value = os.environ.get("ACCOUNTABLE_TODAY")
    return date.fromisoformat(value) if value else date.today()


def now() -> datetime:
    """The current time in UTC, without tzinfo, as stored in the database.

    When ACCOUNTABLE_TODAY is set, the clock is shifted by whole days so that
    "now" falls on that day, keeping times of day realistic.
    """
    real = datetime.now(UTC).replace(tzinfo=None)
    shift = today() - date.today()
    return real + timedelta(days=shift.days)


def test_mode() -> bool:
    """ACCOUNTABLE_TEST=1 turns on the reset endpoint the end-to-end tests use."""
    return os.environ.get("ACCOUNTABLE_TEST") == "1"
