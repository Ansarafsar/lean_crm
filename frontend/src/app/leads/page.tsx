"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useLeads } from "@/hooks/useCrm";
import { cn, formatCurrency, formatDueDate, isOverdue } from "@/lib/utils";
import { LEAD_STATUSES, type LeadStatus } from "@/types";

const FILTERS: Array<LeadStatus | "all"> = ["all", ...LEAD_STATUSES];

export default function LeadsPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");

  // Debounce so each keystroke doesn't hit the API.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { data: leads, isPending, isError, error, refetch } = useLeads(
    search,
    status,
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Leads
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Search your pipeline and open a lead to see the full picture.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search leads..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Search leads by name, company or email"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option}
              onClick={() => setStatus(option)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                status === option
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <ErrorState
          title="Unable to load leads."
          detail={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Deal</th>
                  <th className="px-5 py-3">Next follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isPending ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leads && leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") router.push(`/leads/${lead.id}`);
                      }}
                      className="cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {lead.full_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lead.job_title ?? lead.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{lead.company}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-5 py-4 tabular-nums text-slate-700">
                        {formatCurrency(lead.deal_value, lead.deal_currency)}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-4",
                          isOverdue(lead.next_follow_up)
                            ? "font-medium text-rose-600"
                            : "text-slate-700",
                        )}
                      >
                        {lead.next_follow_up
                          ? formatDueDate(lead.next_follow_up)
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        title={
                          search
                            ? `No leads match "${search}".`
                            : "No leads yet."
                        }
                        hint={
                          search
                            ? "Try a different name, company or email."
                            : "Seed the database to get started."
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
