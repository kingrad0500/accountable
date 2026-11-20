"""Activities (notes, calls and emails) and the timeline query the record areas share."""

from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, model_validator
from sqlalchemy import ColumnElement, Connection, delete, func, insert, select, update

from . import db
from .db import RequiredText, activities, contacts, deals, organizations, stage_changes

router = APIRouter(tags=["activities"])

ActivityType = Literal["note", "call", "email"]


# ---- Timeline ---------------------------------------------------------------


def activity_query():
    """Activities with the names of the contact or deal they belong to and its organization.

    An activity on a deal belongs to the deal's organization; one on a contact to the
    contact's organization. Both are worked out when read (concern 5).
    """
    c = contacts.alias("c")
    d = deals.alias("d")
    co = organizations.alias("co")
    do = organizations.alias("do")
    return select(
        activities.c.id,
        activities.c.type,
        activities.c.description,
        activities.c.occurred_at,
        activities.c.follow_up_date,
        activities.c.follow_up_done,
        activities.c.contact_id,
        c.c.name.label("contact_name"),
        activities.c.deal_id,
        d.c.name.label("deal_name"),
        func.coalesce(d.c.organization_id, c.c.organization_id).label("organization_id"),
        func.coalesce(do.c.name, co.c.name).label("organization_name"),
    ).select_from(
        activities.outerjoin(c, c.c.id == activities.c.contact_id)
        .outerjoin(d, d.c.id == activities.c.deal_id)
        .outerjoin(co, co.c.id == c.c.organization_id)
        .outerjoin(do, do.c.id == d.c.organization_id)
    )


def stage_change_query():
    return select(
        stage_changes.c.id,
        stage_changes.c.deal_id,
        deals.c.name.label("deal_name"),
        stage_changes.c.from_stage,
        stage_changes.c.to_stage,
        stage_changes.c.changed_at,
        deals.c.organization_id,
        organizations.c.name.label("organization_name"),
    ).select_from(
        stage_changes.join(deals, deals.c.id == stage_changes.c.deal_id).outerjoin(
            organizations, organizations.c.id == deals.c.organization_id
        )
    )


def activity_entry(row) -> dict:
    entry = db.row_dict(row)
    entry["kind"] = "activity"
    entry["at"] = entry["occurred_at"]
    return entry


def stage_change_entry(row) -> dict:
    entry = db.row_dict(row)
    entry["kind"] = "stage_change"
    entry["at"] = entry["changed_at"]
    return entry


def _newest_first(entries: list[dict]) -> list[dict]:
    return sorted(entries, key=lambda e: (e["at"], e["kind"] == "stage_change", e["id"]), reverse=True)


def timeline(
    conn: Connection,
    activity_where: ColumnElement[bool],
    stage_change_where: ColumnElement[bool] | None = None,
    limit: int | None = None,
) -> list[dict]:
    """One list of activities and stage changes, newest first (A3)."""
    q = activity_query().where(activity_where).order_by(activities.c.occurred_at.desc())
    if limit:
        q = q.limit(limit)
    entries = [activity_entry(r) for r in conn.execute(q)]
    if stage_change_where is not None:
        sq = stage_change_query().where(stage_change_where).order_by(stage_changes.c.changed_at.desc())
        if limit:
            sq = sq.limit(limit)
        entries += [stage_change_entry(r) for r in conn.execute(sq)]
    entries = _newest_first(entries)
    return entries[:limit] if limit else entries


# ---- Routes -----------------------------------------------------------------


class ActivityIn(BaseModel):
    type: ActivityType
    description: RequiredText
    occurred_at: datetime
    contact_id: int | None = None
    deal_id: int | None = None
    follow_up_date: date | None = None
    follow_up_done: bool = False

    @model_validator(mode="after")
    def one_parent(self):
        # V4: an activity belongs to exactly one contact or one deal.
        if (self.contact_id is None) == (self.deal_id is None):
            raise ValueError("An activity belongs to exactly one contact or one deal")
        return self


class ActivityPatch(BaseModel):
    type: ActivityType | None = None
    description: RequiredText | None = None
    occurred_at: datetime | None = None
    follow_up_date: date | None = None
    follow_up_done: bool | None = None


def get_activity(conn: Connection, activity_id: int) -> dict:
    row = conn.execute(activity_query().where(activities.c.id == activity_id)).first()
    if row is None:
        raise db.not_found("Activity")
    return activity_entry(row)


@router.post("/activities", status_code=201)
def create_activity(body: ActivityIn, conn: Connection = Depends(db.get_conn)) -> dict:
    db.check_exists(conn, contacts, body.contact_id, "contact_id", "contact")
    db.check_exists(conn, deals, body.deal_id, "deal_id", "deal")
    values = body.model_dump()
    values["occurred_at"] = db.to_storage(body.occurred_at)
    new_id = conn.execute(insert(activities).values(**values)).inserted_primary_key[0]
    conn.commit()
    return get_activity(conn, new_id)


@router.patch("/activities/{activity_id}")
def update_activity(activity_id: int, body: ActivityPatch, conn: Connection = Depends(db.get_conn)) -> dict:
    get_activity(conn, activity_id)
    values = body.model_dump(exclude_unset=True)
    for required in ("type", "description", "occurred_at", "follow_up_done"):
        if required in values and values[required] is None:
            raise db.field_error(required, "Required")
    if values.get("occurred_at"):
        values["occurred_at"] = db.to_storage(values["occurred_at"])
    if values.get("follow_up_date", ...) is None:
        values["follow_up_done"] = False
    if values:
        conn.execute(update(activities).where(activities.c.id == activity_id).values(**values))
        conn.commit()
    return get_activity(conn, activity_id)


@router.delete("/activities/{activity_id}", status_code=204)
def delete_activity(activity_id: int, conn: Connection = Depends(db.get_conn)) -> Response:
    get_activity(conn, activity_id)
    conn.execute(delete(activities).where(activities.c.id == activity_id))
    conn.commit()
    return Response(status_code=204)
