export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export type DealStage = LeadStatus;

export type ActivityType = "note" | "call" | "email" | "meeting";

export interface LeadListItem {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title: string | null;
  company: string;
  email: string;
  status: LeadStatus;
  deal_value: number | null;
  deal_currency: string | null;
  deal_stage: DealStage | null;
  next_follow_up: string | null;
}

export interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title: string | null;
  company: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  lead_id: number;
  type: ActivityType;
  content: string;
  created_at: string;
}

export interface Deal {
  id: number;
  lead_id: number;
  name: string;
  value: number;
  currency: string;
  stage: DealStage;
  updated_at: string;
}

export interface Task {
  id: number;
  lead_id: number;
  title: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface LeadSummary {
  who: string;
  important: string;
  history: string;
  missing: string[];
}

/** Failure codes the summary endpoint can return; each maps to distinct copy. */
export type AIErrorCode =
  | "no_key"
  | "upstream"
  | "invalid_output"
  | "weak_output";

export const PIPELINE_STAGES: DealStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
];

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export const ACTIVITY_TYPES: ActivityType[] = [
  "note",
  "call",
  "email",
  "meeting",
];
