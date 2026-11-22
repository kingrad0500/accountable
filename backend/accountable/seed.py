"""Sample data (S1 to S5). `python -m accountable.seed` resets the database.

The data is generated with a fixed random seed and placed relative to "today", so
seeding twice gives the same data and every screen looks alive whenever it's seeded.
`--large` adds thousands of generated records for speed checks (G7).
"""

import argparse
import random
from datetime import date, datetime, time, timedelta
from itertools import pairwise

from sqlalchemy import Connection, delete, insert

from . import config, db
from .dashboard import month_start
from .db import activities, contacts, deals, organizations, stage_changes

ORGANIZATIONS = [
    # name, website, industry, notes
    (
        "Meridian Clinics",
        "meridianclinics.com",
        "Healthcare",
        "Twelve outpatient clinics across the north-west.",
    ),
    ("Oakline Freight", "oaklinefreight.com", "Logistics", "Regional haulage, 180 trucks."),
    (
        "Solace Insurance",
        "solaceinsurance.com",
        "Finance",
        "Mid-sized insurer. Slow procurement, big budgets.",
    ),
    ("Brightwater Foods", "brightwaterfoods.com", "Retail", "Grocery chain with 40 stores."),
    (
        "Ironbridge Manufacturing",
        "ironbridgemfg.com",
        "Manufacturing",
        "Steel fabrication. Moving off an old ERP.",
    ),
    ("Pinecrest Schools", "pinecrestschools.org", "Education", "Group of six independent schools."),
    ("Lumen Retail", "lumenretail.com", "Retail", "Fashion retailer, strong online arm."),
    (
        "Kestrel Capital",
        "kestrelcapital.com",
        "Finance",
        "Investment firm. Wants everything in writing.",
    ),
    ("Vantage Robotics", "vantagerobotics.io", "Manufacturing", "Warehouse robots. Fast-growing."),
    ("Halcyon Studios", "halcyonstudios.co", "Media", "Design and video studio."),
    ("Quarry Software", "quarrysoftware.com", "Software", "B2B SaaS, about 300 staff."),
    ("Cedar Health Group", "cedarhealth.org", "Healthcare", "Private hospital group."),
    ("Northwind Partners", "northwindpartners.com", "Finance", "Accounting and advisory firm."),
    (
        "Bluefin Logistics",
        "bluefinlogistics.com",
        "Logistics",
        "Freight forwarding and warehousing.",
    ),
    ("Tallow & Finch", "tallowandfinch.com", "Retail", "Homeware brand with 12 shops."),
]

CONTACTS = [
    # name, organization index, job title, status
    ("Julia Lam", 0, "Head of Operations", "customer"),
    ("Owen Patel", 0, "IT Manager", "qualified"),
    ("Marcus Kerr", 1, "Operations Director", "qualified"),
    ("Nadia Holm", 1, "Fleet Manager", "lead"),
    ("Priya Desai", 2, "Head of Claims", "qualified"),
    ("George Lindqvist", 2, "Procurement Lead", "lead"),
    ("Isla Moreno", 2, "CIO", "lead"),
    ("Tom Okafor", 3, "Head of Digital", "customer"),
    ("Rachel Byrne", 3, "Store Systems Lead", "customer"),
    ("Ravi Shah", 4, "Plant Manager", "qualified"),
    ("Helen Ward", 4, "Finance Director", "lead"),
    ("Emma Walsh", 5, "Director of IT", "qualified"),
    ("Callum Reid", 5, "Bursar", "lead"),
    ("Chloe Nguyen", 6, "E-commerce Director", "customer"),
    ("Sam Ortiz", 6, "Product Owner", "customer"),
    ("Hana Brooks", 7, "Chief Data Officer", "qualified"),
    ("Felix Grant", 7, "Head of Technology", "lead"),
    ("Yusuf Adeyemi", 8, "VP Engineering", "qualified"),
    ("Mia Johansson", 8, "Product Manager", "lead"),
    ("Grace Fischer", 9, "Studio Director", "customer"),
    ("Leo Barnes", 9, "Producer", "lead"),
    ("Daniel Vos", 10, "VP Infrastructure", "qualified"),
    ("Ella Novak", 10, "Platform Lead", "qualified"),
    ("Aaron Cole", 10, "CTO", "lead"),
    ("Ana Ruiz", 11, "Patient Services Director", "qualified"),
    ("Ben Harper", 11, "Head of IT", "lead"),
    ("Liam Murphy", 12, "Managing Partner", "customer"),
    ("Zara Hussain", 12, "Practice Manager", "customer"),
    ("Sofia Kowalski", 13, "Head of Planning", "customer"),
    ("Jack Doyle", 13, "Warehouse Manager", "customer"),
    ("Ben Fletcher", 14, "Commercial Director", "customer"),
    ("Lucy Tran", 14, "Operations Manager", "customer"),
    ("Noah Fisher", 3, "Buyer", "lead"),
    ("Amelia Clarke", 6, "Head of Stores", "lead"),
    ("Ethan Price", 1, "IT Lead", "lead"),
    ("Sara Lindgren", 7, "Analyst", "lead"),
    ("Oliver Grant", 4, "Engineering Manager", "qualified"),
    ("Freya Lewis", 11, "Clinical Systems Lead", "qualified"),
    ("Hugo Silva", 13, "Finance Manager", "customer"),
    ("Maya Rossi", None, "Independent consultant", "lead"),
]

# Open deals: name, organization, main contact, stage, value, probability, close date (days from today)
OPEN_DEALS = [
    ("Customer portal discovery", 0, "Julia Lam", "new", 18000, 10, 86),
    ("Fleet tracking dashboard", 1, "Marcus Kerr", "new", 42000, 10, 105),
    ("Security review", 2, "Priya Desai", "new", 12500, 10, 71),
    ("Inventory API pilot", 3, "Tom Okafor", "new", 9500, 10, 63),
    ("ERP integration", 4, "Ravi Shah", "qualified", 86000, 25, 58),
    ("Claims workflow automation", 2, "Priya Desai", "qualified", 64000, 30, 76),
    ("Learning platform rollout", 5, "Emma Walsh", "qualified", 27500, 25, -8),
    ("Analytics retainer", 6, "Chloe Nguyen", "qualified", 24000, 25, 30),
    ("Data warehouse build", 7, "Hana Brooks", "proposal", 148000, 50, 32),
    ("Mobile app phase 2", 6, "Chloe Nguyen", "proposal", 71500, 50, 52),
    ("Robotics telemetry", 8, "Yusuf Adeyemi", "proposal", 55000, 60, 24),
    ("Website rebuild", 9, "Grace Fischer", "proposal", 32000, 50, -14),
    ("Managed cloud contract", 10, "Daniel Vos", "negotiation", 118000, 75, 10),
    ("Patient intake redesign", 11, "Ana Ruiz", "negotiation", 46500, 75, -6),
    ("Support desk licences", 12, "Liam Murphy", "negotiation", 21000, 80, 15),
]

# Closed deals: name, organization, main contact, stage, value, months ago, stage it was lost from
CLOSED_DEALS = [
    ("Route planning module", 13, "Sofia Kowalski", "won", 58500, 0, None),
    ("Compliance reporting", 14, "Ben Fletcher", "won", 39000, 1, None),
    ("POS upgrade", 3, "Rachel Byrne", "won", 26000, 1, None),
    ("Annual support renewal", 12, "Zara Hussain", "won", 15000, 2, None),
    ("Telehealth scheduling", 0, "Julia Lam", "won", 76000, 2, None),
    ("Warehouse slotting", 13, "Jack Doyle", "won", 104000, 3, None),
    ("Loyalty app", 6, "Sam Ortiz", "won", 97000, 4, None),
    ("Store analytics", 3, "Tom Okafor", "won", 86500, 5, None),
    ("Client portal", 12, "Liam Murphy", "won", 118000, 6, None),
    ("Online shop relaunch", 14, "Lucy Tran", "won", 54000, 7, None),
    ("Booking system", 0, "Julia Lam", "won", 73500, 8, None),
    ("Video asset library", 9, "Grace Fischer", "won", 91000, 9, None),
    ("Customs paperwork automation", 13, "Hugo Silva", "won", 48500, 10, None),
    ("Rota planner", 11, "Freya Lewis", "won", 62000, 11, None),
    ("CRM migration", 7, "Hana Brooks", "lost", 52000, 0, "negotiation"),
    ("Warehouse sensors", 1, "Nadia Holm", "lost", 34000, 1, "proposal"),
    ("Brand refresh site", 9, "Leo Barnes", "lost", 8000, 2, "qualified"),
    ("Shop-floor tablets", 4, "Oliver Grant", "lost", 41000, 5, "proposal"),
    ("Parent app", 5, "Callum Reid", "lost", 19500, 8, "new"),
]

NOTES = [
    "Procurement wants a second reference before signing.",
    "Budget confirmed for next quarter.",
    "They are comparing us with two other vendors.",
    "New sponsor after the reorganisation. Need to re-introduce ourselves.",
    "Security questionnaire returned.",
    "Legal has the contract. No concerns so far.",
    "Pilot results were good. Team wants to roll out wider.",
    "Asked for a phased plan to spread the cost.",
]
CALLS = [
    "Agreed final pricing. Legal is reviewing the contract.",
    "Scoped the work. Three teams involved.",
    "Intro call. Main pain is manual reporting.",
    "Walked through the proposal. Questions on support hours.",
    "Discussed timelines. They want to start in the new year.",
    "Check-in call. Happy with progress.",
    "Talked through the integration with their finance system.",
]
EMAILS = [
    "Sent the proposal, version 2.",
    "Shared two case studies from similar companies.",
    "Sent the statement of work for review.",
    "Followed up on the open questions from the demo.",
    "Sent pricing options for one and three years.",
    "Confirmed the kickoff agenda.",
]
FOLLOW_UPS = [
    # text, type, days from today (negative is overdue), on a deal (name) or contact (name)
    ("Send revised proposal", "email", -6, ("deal", "Website rebuild")),
    ("Call back about budget", "call", -4, ("contact", "Emma Walsh")),
    ("Chase signed order form", "email", -2, ("deal", "Patient intake redesign")),
    ("Book a security review call", "call", -9, ("deal", "Security review")),
    ("Send updated timeline", "email", -3, ("deal", "ERP integration")),
    ("Ask for the procurement contact", "call", -1, ("contact", "George Lindqvist")),
    ("Confirm kickoff date", "call", 0, ("deal", "Route planning module")),
    ("Share fintech case study", "email", 0, ("contact", "Hana Brooks")),
    ("Demo for the finance team", "call", 1, ("deal", "Claims workflow automation")),
    ("Send contract redlines", "email", 3, ("deal", "Managed cloud contract")),
    ("Intro call with ops lead", "call", 6, ("deal", "Fleet tracking dashboard")),
    ("Prepare pilot success criteria", "note", 8, ("deal", "Robotics telemetry")),
    ("Check in after the board meeting", "call", 9, ("contact", "Isla Moreno")),
    ("Send renewal quote", "email", 11, ("deal", "Support desk licences")),
    ("Review warehouse requirements", "note", 12, ("deal", "Data warehouse build")),
    ("Follow up on the analytics brief", "email", 13, ("deal", "Analytics retainer")),
]

OPEN_PATH = ("new", "qualified", "proposal", "negotiation")


def _at(day: date, hour: float) -> datetime:
    """A stored time (naive UTC) on `day` at `hour` o'clock."""
    return datetime.combine(day, time(0)) + timedelta(minutes=round(hour * 60))


def _close_in_month(rng: random.Random, today: date, months_ago: int) -> date:
    first = month_start(today, months_ago)
    if months_ago == 0:
        return today - timedelta(days=rng.randint(0, max(0, min(today.day - 1, 4))))
    last = (month_start(today, months_ago - 1) - timedelta(days=1)).day
    return first + timedelta(days=rng.randint(0, last - 1))


def wipe(conn: Connection) -> None:
    for table in db.ALL_TABLES:
        conn.execute(delete(table))


def seed(conn: Connection, large: bool = False) -> None:
    """Delete all data and load the sample data (G3). Deterministic for a given day (S5)."""
    rng = random.Random(2026)
    today = config.today()
    wipe(conn)

    org_ids = []
    for name, website, industry, notes in ORGANIZATIONS:
        org_ids.append(
            conn.execute(
                insert(organizations)
                .values(name=name, website=website, industry=industry, notes=notes)
                .returning(organizations.c.id)
            ).scalar_one()
        )

    contact_ids: dict[str, int] = {}
    for name, org, title, status in CONTACTS:
        first, last = name.lower().split(" ", 1)
        domain = ORGANIZATIONS[org][1] if org is not None else "fastmail.com"
        contact_ids[name] = conn.execute(
            insert(contacts)
            .values(
                name=name,
                email=f"{first}.{last.replace(' ', '')}@{domain}",
                phone=f"+1 555 {rng.randint(100, 999)} {rng.randint(1000, 9999)}",
                job_title=title,
                organization_id=org_ids[org] if org is not None else None,
                status=status,
            )
            .returning(contacts.c.id)
        ).scalar_one()

    deal_ids: dict[str, int] = {}
    positions: dict[str, int] = {}
    changes: list[dict] = []

    def add_deal(name, org, contact, stage, value, probability, close_date) -> int:
        position = positions.get(stage, 0)
        positions[stage] = position + 1
        deal_id = conn.execute(
            insert(deals)
            .values(
                name=name,
                organization_id=org_ids[org],
                main_contact_id=contact_ids[contact],
                stage=stage,
                value=value,
                probability=probability,
                close_date=close_date,
                position=position,
            )
            .returning(deals.c.id)
        ).scalar_one()
        deal_ids[name] = deal_id
        return deal_id

    def add_history(deal_id: int, path: list[str], last_day: date) -> None:
        """Stage changes along `path`, the last one on `last_day`, earlier ones weeks before (S4)."""
        day = last_day
        steps = list(pairwise(path))
        for from_stage, to_stage in reversed(steps):
            changes.append(
                {
                    "deal_id": deal_id,
                    "from_stage": from_stage,
                    "to_stage": to_stage,
                    "changed_at": _at(day, rng.choice([9.5, 11, 14.25, 16])),
                }
            )
            day -= timedelta(days=rng.randint(6, 18))

    for name, org, contact, stage, value, probability, days in OPEN_DEALS:
        deal_id = add_deal(
            name, org, contact, stage, value, probability, today + timedelta(days=days)
        )
        path = list(OPEN_PATH[: OPEN_PATH.index(stage) + 1])
        add_history(deal_id, path, today - timedelta(days=rng.randint(1, 12)))

    for name, org, contact, stage, value, months_ago, lost_from in CLOSED_DEALS:
        close = _close_in_month(rng, today, months_ago)
        deal_id = add_deal(name, org, contact, stage, value, 100 if stage == "won" else 0, close)
        reached = "negotiation" if stage == "won" else lost_from
        path = [*OPEN_PATH[: OPEN_PATH.index(reached) + 1], stage]
        add_history(deal_id, path, close)

    conn.execute(insert(stage_changes), changes)

    # Activities across contacts and deals over the past months (S3).
    rows: list[dict] = []
    texts = {"note": NOTES, "call": CALLS, "email": EMAILS}
    deal_names = [d[0] for d in OPEN_DEALS] + [d[0] for d in CLOSED_DEALS]
    for i, name in enumerate(deal_names):
        for j in range(2 if i < len(OPEN_DEALS) else 1):
            kind = ("call", "email", "note")[(i + j) % 3]
            rows.append(
                {
                    "type": kind,
                    "description": texts[kind][(i * 2 + j) % len(texts[kind])],
                    "occurred_at": _at(
                        today - timedelta(days=rng.randint(1, 140)), rng.uniform(8, 17)
                    ),
                    "contact_id": None,
                    "deal_id": deal_ids[name],
                    "follow_up_date": None,
                    "follow_up_done": False,
                }
            )
    for i, (name, *_rest) in enumerate(CONTACTS[:20]):
        kind = ("email", "call", "note")[i % 3]
        rows.append(
            {
                "type": kind,
                "description": texts[kind][(i + 3) % len(texts[kind])],
                "occurred_at": _at(today - timedelta(days=rng.randint(1, 160)), rng.uniform(8, 17)),
                "contact_id": contact_ids[name],
                "deal_id": None,
                "follow_up_date": None,
                "follow_up_done": False,
            }
        )
    # A few follow-ups already done.
    for row in rows[:5]:
        row["follow_up_date"] = row["occurred_at"].date() + timedelta(days=7)
        row["follow_up_done"] = True
    for text, kind, days, (target, name) in FOLLOW_UPS:
        logged = today - timedelta(
            days=max(1, -days + rng.randint(2, 6)) if days < 0 else rng.randint(1, 5)
        )
        rows.append(
            {
                "type": kind,
                "description": text,
                "occurred_at": _at(logged, rng.uniform(8, 17)),
                "contact_id": contact_ids[name] if target == "contact" else None,
                "deal_id": deal_ids[name] if target == "deal" else None,
                "follow_up_date": today + timedelta(days=days),
                "follow_up_done": False,
            }
        )
    conn.execute(insert(activities), rows)

    if large:
        seed_large(conn, rng, today)


# ---- Large dataset ----------------------------------------------------------

FIRST = [
    "Ada",
    "Ben",
    "Cara",
    "Dan",
    "Eve",
    "Finn",
    "Gia",
    "Hal",
    "Ivy",
    "Jon",
    "Kai",
    "Lea",
    "Max",
    "Nia",
    "Oto",
    "Pia",
    "Quin",
    "Ray",
    "Sia",
    "Ted",
    "Uma",
    "Vic",
    "Wes",
    "Xia",
    "Yan",
    "Zoe",
]
LAST = [
    "Adler",
    "Baker",
    "Chen",
    "Dias",
    "Evans",
    "Ford",
    "Gray",
    "Hale",
    "Ito",
    "Jones",
    "Khan",
    "Lopez",
    "Mills",
    "Nash",
    "Olsen",
    "Park",
    "Quinn",
    "Ross",
    "Stone",
    "Tate",
    "Usher",
    "Vale",
    "Wolfe",
    "Young",
    "Zhou",
]
WORDS = [
    "Atlas",
    "Beacon",
    "Cobalt",
    "Delta",
    "Ember",
    "Falcon",
    "Granite",
    "Harbor",
    "Indigo",
    "Juniper",
    "Keystone",
    "Lantern",
    "Maple",
    "Nimbus",
    "Orchid",
    "Pioneer",
    "Quartz",
    "Redwood",
    "Summit",
    "Tidal",
]
KINDS = [
    "Systems",
    "Labs",
    "Group",
    "Partners",
    "Logistics",
    "Health",
    "Retail",
    "Capital",
    "Foods",
    "Works",
]
INDUSTRIES = ["Software", "Healthcare", "Logistics", "Retail", "Finance", "Manufacturing"]
TOPICS = [
    "portal",
    "migration",
    "rollout",
    "integration",
    "renewal",
    "pilot",
    "dashboard",
    "upgrade",
    "audit",
    "automation",
]


def seed_large(conn: Connection, rng: random.Random, today: date) -> None:
    """Thousands more records: 3,000 deals, 3,000 contacts and 10,000 activities in all (G7)."""
    n_orgs, n_contacts, n_deals, n_activities = 300, 3000, 3000, 10000
    existing = {t.name: conn.execute(t.select()).fetchall() for t in (contacts, deals, activities)}
    first_org = conn.execute(
        insert(organizations).values(name="Large data org").returning(organizations.c.id)
    ).scalar_one()
    org_rows = [
        {
            "name": f"{WORDS[i % 20]} {KINDS[(i // 20) % 10]} {i}",
            "website": f"org{i}.example.com",
            "industry": INDUSTRIES[i % 6],
            "notes": None,
        }
        for i in range(n_orgs - 1)
    ]
    conn.execute(insert(organizations), org_rows)
    org_ids = list(range(first_org, first_org + n_orgs))

    start_contact = max((r.id for r in existing["contacts"]), default=0) + 1
    contact_rows = []
    for i in range(n_contacts - len(existing["contacts"])):
        name = f"{FIRST[i % 26]} {LAST[(i // 26) % 25]} {i}"
        contact_rows.append(
            {
                "name": name,
                "email": f"person{i}@example.com",
                "phone": f"+1 555 {i:07d}",
                "job_title": "Manager",
                "organization_id": rng.choice(org_ids),
                "status": ("lead", "qualified", "customer")[i % 3],
            }
        )
    conn.execute(insert(contacts), contact_rows)
    contact_ids = list(range(start_contact, start_contact + len(contact_rows)))

    positions = {s: sum(1 for d in existing["deals"] if d.stage == s) for s in db.STAGES}
    start_deal = max((r.id for r in existing["deals"]), default=0) + 1
    deal_rows, change_rows = [], []
    for i in range(n_deals - len(existing["deals"])):
        stage = rng.choice(db.STAGES)
        closed = stage in db.CLOSED_STAGES
        close = (
            today - timedelta(days=rng.randint(0, 700))
            if closed
            else today + timedelta(days=rng.randint(-30, 200))
        )
        deal_rows.append(
            {
                "name": f"{WORDS[i % 20]} {TOPICS[(i // 20) % 10]} {i}",
                "organization_id": rng.choice(org_ids),
                "main_contact_id": rng.choice(contact_ids),
                "stage": stage,
                "value": rng.randrange(5000, 150000, 500),
                "probability": {
                    "new": 10,
                    "qualified": 25,
                    "proposal": 50,
                    "negotiation": 75,
                    "won": 100,
                    "lost": 0,
                }[stage],
                "close_date": close,
                "position": positions[stage],
            }
        )
        positions[stage] += 1
        if stage != "new":
            change_rows.append(
                {
                    "deal_id": start_deal + i,
                    "from_stage": "new",
                    "to_stage": stage,
                    "changed_at": _at(min(close, today - timedelta(days=1)), 10),
                }
            )
    conn.execute(insert(deals), deal_rows)
    conn.execute(insert(stage_changes), change_rows)
    deal_ids = list(range(start_deal, start_deal + len(deal_rows)))

    activity_rows = []
    for i in range(n_activities - len(existing["activities"])):
        on_deal = i % 2 == 0
        kind = ("note", "call", "email")[i % 3]
        follow = today + timedelta(days=rng.randint(-20, 30)) if i % 25 == 0 else None
        activity_rows.append(
            {
                "type": kind,
                "description": f"Generated {kind} {i}",
                "occurred_at": _at(today - timedelta(days=rng.randint(1, 365)), rng.uniform(8, 17)),
                "contact_id": None if on_deal else rng.choice(contact_ids),
                "deal_id": rng.choice(deal_ids) if on_deal else None,
                "follow_up_date": follow,
                "follow_up_done": False,
            }
        )
    conn.execute(insert(activities), activity_rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset the database to the sample data.")
    parser.add_argument(
        "--large", action="store_true", help="also load thousands of records for speed checks"
    )
    args = parser.parse_args()
    db.create_schema()
    with db.get_engine().begin() as conn:
        seed(conn, large=args.large)
    print(
        f"Sample data loaded into {config.db_path()}" + (" (large dataset)" if args.large else "")
    )


if __name__ == "__main__":
    main()
