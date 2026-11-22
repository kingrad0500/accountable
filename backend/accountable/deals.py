"""Deals: routes, validation, stage rules (DL5) and board ordering (P2)."""

from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Response
from pydantic import BaseModel, Field
from sqlalchemy import Connection, Row, bindparam, delete, func, insert, select, update

from . import config, db
from .activities import timeline
from .db import (
    CLOSED_STAGES,
    OPEN_STAGES,
    RequiredText,
    activities,
    contacts,
    deals,
    organizations,
    stage_changes,
)

router = APIRouter(tags=["deals"])

Stage = Literal["new", "qualified", "proposal", "negotiation", "won", "lost"]

DEFAULT_PROBABILITY = {
    "new": 10,
    "qualified": 25,
    "proposal": 50,
    "negotiation": 75,
    "won": 100,
    "lost": 0,
}


# ---- Rules ------------------------------------------------------------------


def is_late(stage: str, close_date: date | None, today: date | None = None) -> bool:
    """An open deal whose close date is before today (DL2)."""
    today = today or config.today()
    return stage in OPEN_STAGES and close_date is not None and close_date < today


def change_stage(conn: Connection, deal: Row, new_stage: str, chosen: dict | None = None) -> dict:
    """The one place a deal's stage changes, whatever the source (DL5, concern 7).

    Returns the column values to write. The probability becomes the stage's usual one,
    and a move to Won or Lost sets today's close date, unless the user chose a value in
    the same edit (`chosen`). Records one "Moved from X to Y" entry.
    """
    chosen = dict(chosen or {})
    if new_stage == deal.stage:
        return chosen
    values: dict[str, Any] = {"stage": new_stage, "probability": DEFAULT_PROBABILITY[new_stage]}
    if new_stage in CLOSED_STAGES:
        values["close_date"] = config.today()
    values.update(chosen)
    conn.execute(
        insert(stage_changes).values(
            deal_id=deal.id, from_stage=deal.stage, to_stage=new_stage, changed_at=config.now()
        )
    )
    return values


def _column_ids(conn: Connection, stage: str, exclude: int | None = None) -> list[int]:
    q = select(deals.c.id).where(deals.c.stage == stage).order_by(deals.c.position, deals.c.id)
    if exclude is not None:
        q = q.where(deals.c.id != exclude)
    return list(conn.execute(q).scalars())


def _renumber(conn: Connection, ids: list[int]) -> None:
    """Set positions 0..n-1 in the given order, writing only the rows that changed."""
    if not ids:
        return
    current = dict(
        conn.execute(select(deals.c.id, deals.c.position).where(deals.c.id.in_(ids))).all()
    )
    changes = [{"b_id": i, "b_pos": pos} for pos, i in enumerate(ids) if current.get(i) != pos]
    if changes:
        conn.execute(
            update(deals)
            .where(deals.c.id == bindparam("b_id"))
            .values(position=bindparam("b_pos")),
            changes,
        )


def place(conn: Connection, deal_id: int, old_stage: str, stage: str, index: int) -> None:
    """Put a deal at `index` in its column and renumber both columns (P2)."""
    ids = _column_ids(conn, stage, exclude=deal_id)
    ids.insert(max(0, min(index, len(ids))), deal_id)
    _renumber(conn, ids)
    if old_stage != stage:
        _renumber(conn, _column_ids(conn, old_stage))


def move(conn: Connection, deal_id: int, stage: str, index: int) -> None:
    """Change stage if needed, then place the deal at `index` in that column."""
    deal = _get_row(conn, deal_id)
    values = change_stage(conn, deal, stage)
    if values:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))
    place(conn, deal_id, deal.stage, stage, index)


# ---- Queries ----------------------------------------------------------------


def deal_query():
    return select(
        deals.c.id,
        deals.c.name,
        deals.c.organization_id,
        organizations.c.name.label("organization_name"),
        deals.c.main_contact_id,
        contacts.c.name.label("main_contact_name"),
        deals.c.stage,
        deals.c.value,
        deals.c.probability,
        deals.c.close_date,
        deals.c.position,
        deals.c.created_at,
        deals.c.updated_at,
    ).select_from(
        deals.outerjoin(organizations, organizations.c.id == deals.c.organization_id).outerjoin(
            contacts, contacts.c.id == deals.c.main_contact_id
        )
    )


def deal_rows(conn: Connection, where=None) -> list[dict]:
    q = deal_query().order_by(deals.c.stage, deals.c.position, deals.c.id)
    if where is not None:
        q = q.where(where)
    today = config.today()
    out = []
    for row in conn.execute(q):
        d = db.row_dict(row)
        d["is_late"] = is_late(d["stage"], d["close_date"], today)
        out.append(d)
    return out


def _get_row(conn: Connection, deal_id: int) -> Row:
    row = conn.execute(select(deals).where(deals.c.id == deal_id)).first()
    if row is None:
        raise db.not_found("Deal")
    return row


def get_deal(conn: Connection, deal_id: int) -> dict:
    rows = deal_rows(conn, deals.c.id == deal_id)
    if not rows:
        raise db.not_found("Deal")
    return rows[0]


# ---- Routes -----------------------------------------------------------------


class DealIn(BaseModel):
    name: RequiredText
    organization_id: int
    main_contact_id: int | None = None
    stage: Stage
    value: int = Field(ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None


class DealPatch(BaseModel):
    name: RequiredText | None = None
    organization_id: int | None = None
    main_contact_id: int | None = None
    stage: Stage | None = None
    value: int | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None


class MoveIn(BaseModel):
    stage: Stage
    index: int = Field(ge=0)


@router.get("/deals")
def list_deals(conn: db.Conn) -> Response:
    return db.json_response(deal_rows(conn))


@router.post("/deals", status_code=201)
def create_deal(body: DealIn, conn: db.Conn) -> dict:
    db.check_exists(conn, organizations, body.organization_id, "organization_id", "organization")
    db.check_exists(conn, contacts, body.main_contact_id, "main_contact_id", "contact")
    values = body.model_dump()
    if values["probability"] is None:
        values["probability"] = DEFAULT_PROBABILITY[body.stage]  # DL6
    if body.stage in CLOSED_STAGES and values["close_date"] is None:
        values["close_date"] = config.today()
    # New deals go to the top of their column (P4).
    conn.execute(
        update(deals).where(deals.c.stage == body.stage).values(position=deals.c.position + 1)
    )
    new_id = conn.execute(
        insert(deals).values(**values, position=0).returning(deals.c.id)
    ).scalar_one()
    conn.commit()
    return get_deal(conn, new_id)


@router.get("/deals/{deal_id}")
def read_deal(deal_id: int, conn: db.Conn) -> dict:
    deal = get_deal(conn, deal_id)
    deal["timeline"] = timeline(
        conn, activities.c.deal_id == deal_id, stage_changes.c.deal_id == deal_id
    )
    return deal


@router.patch("/deals/{deal_id}")
def update_deal(deal_id: int, body: DealPatch, conn: db.Conn) -> dict:
    deal = _get_row(conn, deal_id)
    fields = body.model_dump(exclude_unset=True)
    for required in ("name", "stage", "value", "probability"):
        if required in fields and fields[required] is None:
            raise db.field_error(required, "Required")
    # Saving from the edit form needs an organization, even for a deal that lost its own (concern 3).
    if fields.get("organization_id", deal.organization_id) is None:
        raise db.field_error("organization_id", "Required")
    db.check_exists(
        conn, organizations, fields.get("organization_id"), "organization_id", "organization"
    )
    db.check_exists(conn, contacts, fields.get("main_contact_id"), "main_contact_id", "contact")

    new_stage = fields.pop("stage", deal.stage)
    if new_stage != deal.stage:
        # A value the user changed in the same edit wins over the stage's default.
        chosen = {
            k: fields.pop(k)
            for k in ("probability", "close_date")
            if k in fields and fields[k] != getattr(deal, k)
        }
        fields.pop("probability", None)
        fields.pop("close_date", None)
        fields.update(change_stage(conn, deal, new_stage, chosen))
    if fields:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**fields))
    if new_stage != deal.stage:
        place(conn, deal_id, deal.stage, new_stage, 0)
    conn.commit()
    return get_deal(conn, deal_id)


@router.post("/deals/{deal_id}/move")
def move_deal(deal_id: int, body: MoveIn, conn: db.Conn) -> dict:
    move(conn, deal_id, body.stage, body.index)
    conn.commit()
    return get_deal(conn, deal_id)


@router.get("/deals/{deal_id}/delete-impact")
def deal_delete_impact(deal_id: int, conn: db.Conn) -> dict:
    _get_row(conn, deal_id)
    count = lambda table: conn.execute(
        select(func.count()).where(table.c.deal_id == deal_id)
    ).scalar_one()
    return {"activities": count(activities), "stage_changes": count(stage_changes)}


@router.delete("/deals/{deal_id}", status_code=204)
def delete_deal(deal_id: int, conn: db.Conn) -> Response:
    deal = _get_row(conn, deal_id)
    conn.execute(delete(deals).where(deals.c.id == deal_id))  # activities and stage history cascade
    _renumber(conn, _column_ids(conn, deal.stage))
    conn.commit()
    return Response(status_code=204)
