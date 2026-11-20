// The API's types (backend/accountable/*.py).
import type { StageKey, StatusKey } from "../lib/stages";

export type ActivityType = "note" | "call" | "email";

export type Organization = {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  contact_count: number;
  open_deal_count: number;
  open_value: number;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization_id: number | null;
  organization_name: string | null;
  status: StatusKey;
  created_at: string;
  updated_at: string;
};

export type Deal = {
  id: number;
  name: string;
  organization_id: number | null;
  organization_name: string | null;
  main_contact_id: number | null;
  main_contact_name: string | null;
  stage: StageKey;
  value: number;
  probability: number;
  close_date: string | null;
  position: number;
  is_late: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityEntry = {
  kind: "activity";
  id: number;
  at: string;
  type: ActivityType;
  description: string;
  occurred_at: string;
  follow_up_date: string | null;
  follow_up_done: boolean;
  contact_id: number | null;
  contact_name: string | null;
  deal_id: number | null;
  deal_name: string | null;
  organization_id: number | null;
  organization_name: string | null;
};

export type StageChangeEntry = {
  kind: "stage_change";
  id: number;
  at: string;
  deal_id: number;
  deal_name: string;
  from_stage: StageKey;
  to_stage: StageKey;
  changed_at: string;
  organization_id: number | null;
  organization_name: string | null;
};

export type TimelineEntry = ActivityEntry | StageChangeEntry;

export type OrganizationDetail = Organization & { contacts: Contact[]; deals: Deal[]; timeline: TimelineEntry[] };
export type ContactDetail = Contact & { deals: Deal[]; timeline: TimelineEntry[] };
export type DealDetail = Deal & { timeline: TimelineEntry[] };

export type DeleteImpact = { contacts?: number; deals?: number; activities?: number; stage_changes?: number };

export type FollowUp = ActivityEntry & { group: "overdue" | "today" | "upcoming" };

export type Dashboard = {
  today: string;
  figures: {
    revenue_won_12m: number;
    revenue_won_prior_12m: number;
    open_value: number;
    open_count: number;
    expected_revenue: number;
    won_12m: number;
    lost_12m: number;
    win_rate: number | null;
    late_deals: number;
    overdue_follow_ups: number;
    needs_attention: number;
  };
  months: { month: string; revenue: number; won: number; lost: number }[];
  funnel: { stages: { stage: StageKey; value: number; count: number }[]; lost_value: number; lost_count: number };
  recent: TimelineEntry[];
  follow_ups: FollowUp[];
  follow_up_counts: { overdue: number; today: number; upcoming: number };
};
