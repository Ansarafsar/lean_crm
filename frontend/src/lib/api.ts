import type {
  Activity,
  ActivityType,
  Deal,
  DealStage,
  Lead,
  LeadListItem,
  LeadStatus,
  LeadSummary,
  Task,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

/** Carries the backend's status and `code` so callers can branch on failure. */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0, "network");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    let code: string | undefined;

    try {
      const body = await response.json();
      code = body?.code;
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
        // FastAPI validation errors arrive as an array.
        message = body.detail[0].msg;
      }
    } catch {
      /* keep the default message */
    }

    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listLeads(search?: string, status?: LeadStatus | "all") {
    const params = new URLSearchParams();
    if (search?.trim()) params.set("search", search.trim());
    if (status && status !== "all") params.set("status", status);
    const qs = params.toString();
    return request<LeadListItem[]>(`/api/leads${qs ? `?${qs}` : ""}`);
  },

  getLead(id: number) {
    return request<Lead>(`/api/leads/${id}`);
  },

  listActivities(leadId: number) {
    return request<Activity[]>(`/api/leads/${leadId}/activities`);
  },

  createActivity(leadId: number, body: { type: ActivityType; content: string }) {
    return request<Activity>(`/api/leads/${leadId}/activities`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getDeal(leadId: number) {
    return request<Deal>(`/api/leads/${leadId}/deal`);
  },

  updateDealStage(dealId: number, stage: DealStage) {
    return request<Deal>(`/api/deals/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
  },

  listTasks(leadId: number) {
    return request<Task[]>(`/api/leads/${leadId}/tasks`);
  },

  createTask(leadId: number, body: { title: string; due_date: string | null }) {
    return request<Task>(`/api/leads/${leadId}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateTask(taskId: number, body: { completed?: boolean; title?: string }) {
    return request<Task>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  generateSummary(leadId: number) {
    return request<LeadSummary>(`/api/leads/${leadId}/summary`, {
      method: "POST",
    });
  },
};
