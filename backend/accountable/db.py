"""Engine, SQLite pragmas, every table, and the per-request connection.

All tables live in one MetaData so a later migration tool sees the whole schema.
"""

import json
from collections.abc import Iterator
from datetime import UTC, date, datetime
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Response
from pydantic import AfterValidator, BeforeValidator
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Connection,
    Date,
    DateTime,
    Engine,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    event,
    select,
)

from . import config

STAGES = ("new", "qualified", "proposal", "negotiation", "won", "lost")
OPEN_STAGES = ("new", "qualified", "proposal", "negotiation")
CLOSED_STAGES = ("won", "lost")
STATUSES = ("lead", "qualified", "customer")
ACTIVITY_TYPES = ("note", "call", "email")

metadata = MetaData()


def _utcnow() -> datetime:
    return config.now()


def _timestamps() -> list[Column]:
    return [
        Column("created_at", DateTime, nullable=False, default=_utcnow),
        Column("updated_at", DateTime, nullable=False, default=_utcnow, onupdate=_utcnow),
    ]


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("website", String),
    Column("industry", String),
    Column("notes", Text),
    *_timestamps(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("email", String),
    Column("phone", String),
    Column("job_title", String),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL")),
    Column("status", String, nullable=False, default="lead"),
    *_timestamps(),
    CheckConstraint("status IN ('lead', 'qualified', 'customer')", name="contact_status"),
    Index("ix_contacts_organization_id", "organization_id"),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL")),
    Column("main_contact_id", Integer, ForeignKey("contacts.id", ondelete="SET NULL")),
    Column("stage", String, nullable=False),
    Column("value", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("close_date", Date),
    Column("position", Integer, nullable=False, default=0),
    *_timestamps(),
    CheckConstraint(
        "stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')", name="deal_stage"
    ),
    CheckConstraint("value >= 0", name="deal_value"),
    CheckConstraint("probability BETWEEN 0 AND 100", name="deal_probability"),
    Index("ix_deals_organization_id", "organization_id"),
    Index("ix_deals_main_contact_id", "main_contact_id"),
    Index("ix_deals_stage_position", "stage", "position"),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String, nullable=False),
    Column("description", Text, nullable=False),
    Column("occurred_at", DateTime, nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE")),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE")),
    Column("follow_up_date", Date),
    Column("follow_up_done", Boolean, nullable=False, default=False),
    *_timestamps(),
    CheckConstraint("(contact_id IS NULL) != (deal_id IS NULL)", name="activity_one_parent"),
    CheckConstraint("type IN ('note', 'call', 'email')", name="activity_type"),
    Index("ix_activities_contact_id", "contact_id"),
    Index("ix_activities_deal_id", "deal_id"),
    Index("ix_activities_occurred_at", "occurred_at"),
    Index("ix_activities_follow_up", "follow_up_done", "follow_up_date"),
)

stage_changes = Table(
    "stage_changes",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE"), nullable=False),
    Column("from_stage", String, nullable=False),
    Column("to_stage", String, nullable=False),
    Column("changed_at", DateTime, nullable=False),
    *_timestamps(),
    Index("ix_stage_changes_deal_id", "deal_id"),
    Index("ix_stage_changes_changed_at", "changed_at"),
)

ALL_TABLES = (stage_changes, activities, deals, contacts, organizations)

_engine: Engine | None = None


def _set_pragmas(dbapi_connection, _record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        path = config.db_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
        event.listen(_engine, "connect", _set_pragmas)
    return _engine


def dispose_engine() -> None:
    """Close every connection, so the next use opens the current ACCOUNTABLE_DB."""
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None


def create_schema() -> None:
    metadata.create_all(get_engine())


def get_conn() -> Iterator[Connection]:
    """One connection per request. Routes that write call conn.commit()."""
    with get_engine().connect() as conn:
        yield conn


Conn = Annotated[Connection, Depends(get_conn)]


def as_utc(value: datetime | None) -> datetime | None:
    """Stored times are naive UTC. Mark them as UTC for the API."""
    return value.replace(tzinfo=UTC) if value is not None else None


def to_storage(value: datetime) -> datetime:
    """Convert an incoming time to naive UTC for storage."""
    if value.tzinfo is not None:
        value = value.astimezone(UTC).replace(tzinfo=None)
    return value


def row_dict(row: Any) -> dict:
    """A result row as a plain dict, with stored times marked as UTC."""
    return {k: as_utc(v) if isinstance(v, datetime) else v for k, v in zip(row._fields, row)}


def _json_default(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    raise TypeError(f"Can't encode {type(value).__name__} as JSON")


def json_response(data: Any) -> Response:
    """JSON for the big list endpoints, encoded in one pass.

    FastAPI's default checks and converts every field of every row, which costs about
    100 ms for 3,000 deals. The output is the same: ISO dates, and UTC times ending in Z.
    """
    return Response(
        json.dumps(data, default=_json_default, separators=(",", ":")),
        media_type="application/json",
    )


def field_error(field: str, msg: str, status: int = 422) -> HTTPException:
    """An error in FastAPI's standard validation shape, for one body field."""
    return HTTPException(
        status, detail=[{"loc": ["body", field], "msg": msg, "type": "value_error"}]
    )


def check_exists(conn: Connection, table: Table, id_: int | None, field: str, label: str) -> None:
    if (
        id_ is not None
        and conn.execute(select(table.c.id).where(table.c.id == id_)).first() is None
    ):
        raise field_error(field, f"No such {label}")


def not_found(label: str) -> HTTPException:
    return HTTPException(404, detail=f"{label} not found")


# Field types shared by the areas' request models (V1).


def _required(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Required")
    return value


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


RequiredText = Annotated[str, AfterValidator(_required)]
OptionalText = Annotated[str | None, BeforeValidator(_blank_to_none)]
