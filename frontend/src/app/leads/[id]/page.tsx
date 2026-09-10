"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AISummaryCard } from "@/components/AISummaryCard";
import { DealPipeline } from "@/components/DealPipeline";
import { TaskList } from "@/components/TaskList";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useLead } from "@/hooks/useCrm";
import { ApiError } from "@/lib/api";

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">
        {value || "—"}
      </dd>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = Number(params.id);

  const { data: lead, isPending, isError, error, refetch } = useLead(leadId);

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <div>
      <Link
        href="/leads"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title={notFound ? "That lead doesn't exist." : "Unable to load lead."}
          detail={
            notFound
              ? "It may have been removed. Head back to the leads list."
              : (error as Error)?.message
          }
          onRetry={notFound ? undefined : () => refetch()}
        />
      ) : lead ? (
        <div className="space-y-5">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {lead.full_name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {lead.job_title ? `${lead.job_title} · ` : ""}
                {lead.company}
              </p>
              <a
                href={`mailto:${lead.email}`}
                className="text-sm text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
              >
                {lead.email}
              </a>
            </div>
            <StatusBadge status={lead.status} className="mt-1" />
          </header>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Lead Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-slate-100">
                  <InfoRow label="Company" value={lead.company} />
                  <InfoRow label="Industry" value={lead.industry} />
                  <InfoRow label="Company size" value={lead.company_size} />
                  <InfoRow label="Location" value={lead.location} />
                  <InfoRow label="Source" value={lead.source} />
                  <InfoRow label="Phone" value={lead.phone} />
                </dl>
              </CardContent>
            </Card>

            <AISummaryCard leadId={leadId} />
          </div>

          <DealPipeline leadId={leadId} />

          <div className="grid gap-5 lg:grid-cols-2">
            <ActivityTimeline leadId={leadId} />
            <TaskList leadId={leadId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
