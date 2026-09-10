"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ActivityType, DealStage, LeadStatus } from "@/types";

/** Query keys kept in one place so invalidation can't drift from the reads. */
export const keys = {
  leads: (search: string, status: string) => ["leads", search, status] as const,
  lead: (id: number) => ["lead", id] as const,
  activities: (id: number) => ["activities", id] as const,
  tasks: (id: number) => ["tasks", id] as const,
  deal: (id: number) => ["deal", id] as const,
};

export function useLeads(search: string, status: LeadStatus | "all") {
  return useQuery({
    queryKey: keys.leads(search, status),
    queryFn: () => api.listLeads(search, status),
    placeholderData: (previous) => previous, // keeps the table stable while typing
  });
}

export function useLead(id: number) {
  return useQuery({ queryKey: keys.lead(id), queryFn: () => api.getLead(id) });
}

export function useActivities(leadId: number) {
  return useQuery({
    queryKey: keys.activities(leadId),
    queryFn: () => api.listActivities(leadId),
  });
}

export function useTasks(leadId: number) {
  return useQuery({
    queryKey: keys.tasks(leadId),
    queryFn: () => api.listTasks(leadId),
  });
}

export function useDeal(leadId: number) {
  return useQuery({
    queryKey: keys.deal(leadId),
    queryFn: () => api.getDeal(leadId),
    // A lead without a deal is a valid state, not an error worth retrying.
    retry: false,
  });
}

export function useCreateActivity(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { type: ActivityType; content: string }) =>
      api.createActivity(leadId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.activities(leadId) });
    },
  });
}

export function useUpdateDealStage(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, stage }: { dealId: number; stage: DealStage }) =>
      api.updateDealStage(dealId, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.deal(leadId) });
      // The backend mirrors the stage onto lead.status, so refresh both views.
      qc.invalidateQueries({ queryKey: keys.lead(leadId) });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useCreateTask(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; due_date: string | null }) =>
      api.createTask(leadId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tasks(leadId) });
      qc.invalidateQueries({ queryKey: ["leads"] }); // next follow-up column
    },
  });
}

export function useToggleTask(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: number; completed: boolean }) =>
      api.updateTask(taskId, { completed }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tasks(leadId) });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

/** Summaries are derived data - generated on demand, never cached server-side. */
export function useGenerateSummary(leadId: number) {
  return useMutation({ mutationFn: () => api.generateSummary(leadId) });
}
