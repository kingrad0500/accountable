"""Organizations: routes, validation, delete impact and the organization timeline."""

import re
from typing import Annotated

from fastapi import APIRouter, Response
from pydantic import AfterValidator, BaseModel
from sqlalchemy import Connection, delete, func, insert, or_, select, update

from . import db
from .activities import timeline
from .contacts import contact_rows
from .db import (
    OPEN_STAGES,
    OptionalText,
    RequiredText,
    activities,
    contacts,
    deals,
    organizations,
    stage_changes,
)
from .deals import deal_rows

router = APIRouter(tags=["organizations"])

WEBSITE_RE = re.compile(
    r"^(https?://)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d+)?(/\S*)?$", re.IGNORECASE
)


def _website(value: str | None) -> str | None:
    if value is not None and not WEBSITE_RE.match(value):
        raise ValueError("Enter a website such as acme.com")
    return value


Website = Annotated[OptionalText, AfterValidator(_website)]


class OrganizationIn(BaseModel):
    name: RequiredText
    website: Website = None
    industry: OptionalText = None
    notes: OptionalText = None


class OrganizationPatch(BaseModel):
    name: RequiredText | None = None
    website: Website = None
    industry: OptionalText = None
    notes: OptionalText = None


def organization_rows(conn: Connection, where=None) -> list[dict]:
    """Organizations with their contact count, open deal count and open value (O1)."""
    contact_counts = (
        select(contacts.c.organization_id, func.count().label("n"))
        .group_by(contacts.c.organization_id)
        .subquery()
    )
    open_deals = (
        select(
            deals.c.organization_id,
            func.count().label("n"),
            func.sum(deals.c.value).label("value"),
        )
        .where(deals.c.stage.in_(OPEN_STAGES))
        .group_by(deals.c.organization_id)
        .subquery()
    )
    q = (
        select(
            organizations,
            func.coalesce(contact_counts.c.n, 0).label("contact_count"),
            func.coalesce(open_deals.c.n, 0).label("open_deal_count"),
            func.coalesce(open_deals.c.value, 0).label("open_value"),
        )
        .select_from(
            organizations.outerjoin(
                contact_counts, contact_counts.c.organization_id == organizations.c.id
            ).outerjoin(open_deals, open_deals.c.organization_id == organizations.c.id)
        )
        .order_by(organizations.c.name, organizations.c.id)
    )
    if where is not None:
        q = q.where(where)
    return [db.row_dict(r) for r in conn.execute(q)]


def get_organization(conn: Connection, org_id: int) -> dict:
    rows = organization_rows(conn, organizations.c.id == org_id)
    if not rows:
        raise db.not_found("Organization")
    return rows[0]


def organization_timeline(conn: Connection, org_id: int) -> list[dict]:
    """Activities for the organization's contacts and deals, plus its deals' stage changes (O2)."""
    its_contacts = select(contacts.c.id).where(contacts.c.organization_id == org_id)
    its_deals = select(deals.c.id).where(deals.c.organization_id == org_id)
    return timeline(
        conn,
        or_(activities.c.contact_id.in_(its_contacts), activities.c.deal_id.in_(its_deals)),
        stage_changes.c.deal_id.in_(its_deals),
    )


@router.get("/organizations")
def list_organizations(conn: db.Conn) -> Response:
    return db.json_response(organization_rows(conn))


@router.post("/organizations", status_code=201)
def create_organization(body: OrganizationIn, conn: db.Conn) -> dict:
    new_id = conn.execute(
        insert(organizations).values(**body.model_dump()).returning(organizations.c.id)
    ).scalar_one()
    conn.commit()
    return get_organization(conn, new_id)


@router.get("/organizations/{org_id}")
def read_organization(org_id: int, conn: db.Conn) -> dict:
    org = get_organization(conn, org_id)
    org["contacts"] = contact_rows(conn, contacts.c.organization_id == org_id)
    org["deals"] = deal_rows(conn, deals.c.organization_id == org_id)
    org["timeline"] = organization_timeline(conn, org_id)
    return org


@router.patch("/organizations/{org_id}")
def update_organization(org_id: int, body: OrganizationPatch, conn: db.Conn) -> dict:
    get_organization(conn, org_id)
    fields = body.model_dump(exclude_unset=True)
    if "name" in fields and fields["name"] is None:
        raise db.field_error("name", "Required")
    if fields:
        conn.execute(update(organizations).where(organizations.c.id == org_id).values(**fields))
        conn.commit()
    return get_organization(conn, org_id)


@router.get("/organizations/{org_id}/delete-impact")
def organization_delete_impact(org_id: int, conn: db.Conn) -> dict:
    get_organization(conn, org_id)
    n_contacts = conn.execute(
        select(func.count()).where(contacts.c.organization_id == org_id)
    ).scalar_one()
    n_deals = conn.execute(
        select(func.count()).where(deals.c.organization_id == org_id)
    ).scalar_one()
    return {"contacts": n_contacts, "deals": n_deals}


@router.delete("/organizations/{org_id}", status_code=204)
def delete_organization(org_id: int, conn: db.Conn) -> Response:
    get_organization(conn, org_id)
    # Contacts and deals stay, with no organization (D1).
    conn.execute(delete(organizations).where(organizations.c.id == org_id))
    conn.commit()
    return Response(status_code=204)
