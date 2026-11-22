"""Contacts: routes, validation, delete impact and the contact timeline."""

import re
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import AfterValidator, BaseModel
from sqlalchemy import Connection, delete, func, insert, or_, select, update

from . import db
from .activities import timeline
from .db import OptionalText, RequiredText, activities, contacts, deals, organizations
from .deals import deal_rows

router = APIRouter(tags=["contacts"])

Status = Literal["lead", "qualified", "customer"]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


def _email(value: str | None) -> str | None:
    if value is not None and not EMAIL_RE.match(value):
        raise ValueError("Enter an email such as name@company.com")
    return value


Email = Annotated[OptionalText, AfterValidator(_email)]


class ContactIn(BaseModel):
    name: RequiredText
    email: Email = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: int | None = None
    status: Status = "lead"


class ContactPatch(BaseModel):
    name: RequiredText | None = None
    email: Email = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: int | None = None
    status: Status | None = None


def contact_query():
    return select(
        contacts,
        organizations.c.name.label("organization_name"),
    ).select_from(contacts.outerjoin(organizations, organizations.c.id == contacts.c.organization_id))


def contact_rows(conn: Connection, where=None) -> list[dict]:
    q = contact_query().order_by(contacts.c.name, contacts.c.id)
    if where is not None:
        q = q.where(where)
    return [db.row_dict(r) for r in conn.execute(q)]


def get_contact(conn: Connection, contact_id: int) -> dict:
    rows = contact_rows(conn, contacts.c.id == contact_id)
    if not rows:
        raise db.not_found("Contact")
    return rows[0]


def contact_timeline_where(contact_id: int):
    """The contact's own activities, plus those on deals they're the main contact of (C3)."""
    their_deals = select(deals.c.id).where(deals.c.main_contact_id == contact_id)
    return or_(activities.c.contact_id == contact_id, activities.c.deal_id.in_(their_deals))


@router.get("/contacts")
def list_contacts(conn: Connection = Depends(db.get_conn)) -> Response:
    return db.json_response(contact_rows(conn))


@router.post("/contacts", status_code=201)
def create_contact(body: ContactIn, conn: Connection = Depends(db.get_conn)) -> dict:
    db.check_exists(conn, organizations, body.organization_id, "organization_id", "organization")
    new_id = conn.execute(insert(contacts).values(**body.model_dump())).inserted_primary_key[0]
    conn.commit()
    return get_contact(conn, new_id)


@router.get("/contacts/{contact_id}")
def read_contact(contact_id: int, conn: Connection = Depends(db.get_conn)) -> dict:
    contact = get_contact(conn, contact_id)
    contact["deals"] = deal_rows(conn, deals.c.main_contact_id == contact_id)
    contact["timeline"] = timeline(conn, contact_timeline_where(contact_id))
    return contact


@router.patch("/contacts/{contact_id}")
def update_contact(contact_id: int, body: ContactPatch, conn: Connection = Depends(db.get_conn)) -> dict:
    get_contact(conn, contact_id)
    fields = body.model_dump(exclude_unset=True)
    for required in ("name", "status"):
        if required in fields and fields[required] is None:
            raise db.field_error(required, "Required")
    db.check_exists(conn, organizations, fields.get("organization_id"), "organization_id", "organization")
    if fields:
        conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**fields))
        conn.commit()
    return get_contact(conn, contact_id)


@router.get("/contacts/{contact_id}/delete-impact")
def contact_delete_impact(contact_id: int, conn: Connection = Depends(db.get_conn)) -> dict:
    get_contact(conn, contact_id)
    n_activities = conn.execute(select(func.count()).where(activities.c.contact_id == contact_id)).scalar_one()
    n_deals = conn.execute(select(func.count()).where(deals.c.main_contact_id == contact_id)).scalar_one()
    return {"activities": n_activities, "deals": n_deals}


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int, conn: Connection = Depends(db.get_conn)) -> Response:
    get_contact(conn, contact_id)
    # Their activities cascade; their deals stay, with no main contact (D1).
    conn.execute(delete(contacts).where(contacts.c.id == contact_id))
    conn.commit()
    return Response(status_code=204)
