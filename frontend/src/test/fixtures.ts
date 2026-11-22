// Record builders for tests: sensible defaults, overridden per test.
import type {
  ActivityEntry,
  Contact,
  ContactDetail,
  Dashboard,
  Deal,
  DealDetail,
  FollowUp,
  Organization,
  OrganizationDetail,
  StageChangeEntry,
} from "../api/types";
import { addDays, todayISO } from "../lib/dates";

/** A date `days` from today, as the API sends it ("YYYY-MM-DD"). */
export const daysFromToday = (days: number) => addDays(todayISO(), days);

const STAMP = "2026-01-01T00:00:00Z";

export function anOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 1,
    name: "Cedar Health",
    website: null,
    industry: null,
    notes: null,
    contact_count: 0,
    open_deal_count: 0,
    open_value: 0,
    created_at: STAMP,
    updated_at: STAMP,
    ...overrides,
  };
}

export function anOrganizationDetail(
  overrides: Partial<OrganizationDetail> = {},
): OrganizationDetail {
  return { ...anOrganization(), contacts: [], deals: [], timeline: [], ...overrides };
}

export function aContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 1,
    name: "Ana Ruiz",
    email: null,
    phone: null,
    job_title: null,
    organization_id: null,
    organization_name: null,
    status: "lead",
    created_at: STAMP,
    updated_at: STAMP,
    ...overrides,
  };
}

export function aContactDetail(overrides: Partial<ContactDetail> = {}): ContactDetail {
  return { ...aContact(), deals: [], timeline: [], ...overrides };
}

export function aDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1,
    name: "Website rebuild",
    organization_id: null,
    organization_name: null,
    main_contact_id: null,
    main_contact_name: null,
    stage: "proposal",
    value: 1000,
    probability: 50,
    close_date: null,
    position: 0,
    is_late: false,
    created_at: STAMP,
    updated_at: STAMP,
    ...overrides,
  };
}

export function aDealDetail(overrides: Partial<DealDetail> = {}): DealDetail {
  return { ...aDeal(), timeline: [], ...overrides };
}

export function anActivity(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    kind: "activity",
    id: 1,
    at: STAMP,
    type: "note",
    description: "Sent the proposal",
    occurred_at: STAMP,
    follow_up_date: null,
    follow_up_done: false,
    contact_id: null,
    contact_name: null,
    deal_id: null,
    deal_name: null,
    organization_id: null,
    organization_name: null,
    ...overrides,
  };
}

export function aStageChange(overrides: Partial<StageChangeEntry> = {}): StageChangeEntry {
  return {
    kind: "stage_change",
    id: 1,
    at: STAMP,
    deal_id: 1,
    deal_name: "Website rebuild",
    from_stage: "proposal",
    to_stage: "negotiation",
    changed_at: STAMP,
    organization_id: null,
    organization_name: null,
    ...overrides,
  };
}

export function aFollowUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return { ...anActivity(), group: "upcoming", ...overrides };
}

export function aDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    today: "2026-11-18",
    figures: {
      revenue_won_12m: 949000,
      revenue_won_prior_12m: 0,
      open_value: 775500,
      open_count: 15,
      expected_revenue: 360700,
      won_12m: 14,
      lost_12m: 5,
      win_rate: 14 / 19,
      late_deals: 3,
      overdue_follow_ups: 6,
      needs_attention: 9,
    },
    months: [
      { month: "2026-10", revenue: 120000, won: 2, lost: 0 },
      { month: "2026-11", revenue: 58500, won: 1, lost: 1 },
    ],
    funnel: {
      stages: [
        { stage: "new", value: 1879000, count: 34 },
        { stage: "won", value: 949000, count: 14 },
      ],
      lost_value: 154500,
      lost_count: 5,
    },
    recent: [],
    follow_ups: [],
    follow_up_counts: { overdue: 0, today: 0, upcoming: 0 },
    ...overrides,
  };
}

export const ORGANIZATIONS: Organization[] = [
  anOrganization({ id: 1, name: "Acme" }),
  anOrganization({ id: 2, name: "Globex" }),
];

export const CONTACTS: Contact[] = [
  aContact({ id: 10, name: "Ana Ruiz", organization_id: 1, organization_name: "Acme" }),
  aContact({ id: 11, name: "Ben Fletcher", organization_id: 1, organization_name: "Acme" }),
  aContact({ id: 12, name: "Gina Gold", organization_id: 2, organization_name: "Globex" }),
];
