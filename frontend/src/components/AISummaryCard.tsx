"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingLine } from "@/components/ui/states";
import { useGenerateSummary } from "@/hooks/useCrm";
import { ApiError } from "@/lib/api";
import type { AIErrorCode } from "@/types";

/** One message per failure mode, so a rep always knows what to do next. */
const ERROR_COPY: Record<
  AIErrorCode | "network" | "default",
  { title: string; detail: string; retry: boolean }
> = {
  no_key: {
    title: "AI summary unavailable.",
    detail: "Configure an LLM API key to generate summaries.",
    retry: false,
  },
  upstream: {
    title: "Couldn't generate the summary right now.",
    detail: "Your CRM data is safe — please try again.",
    retry: true,
  },
  invalid_output: {
    title: "AI returned an invalid summary.",
    detail: "Please try again.",
    retry: true,
  },
  weak_output: {
    title: "We couldn't generate a reliable summary.",
    detail: "Please try again.",
    retry: true,
  },
  network: {
    title: "Couldn't reach the server.",
    detail: "Your CRM data is safe — please try again.",
    retry: true,
  },
  default: {
    title: "Couldn't generate the summary right now.",
    detail: "Your CRM data is safe — please try again.",
    retry: true,
  },
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </h4>
      <div className="mt-1.5 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </div>
  );
}

export function AISummaryCard({ leadId }: { leadId: number }) {
  const { mutate, data, isPending, isError, error, reset } =
    useGenerateSummary(leadId);

  const code = error instanceof ApiError ? error.code : undefined;
  const copy = ERROR_COPY[(code as AIErrorCode) ?? "default"] ?? ERROR_COPY.default;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>AI Lead Summary</CardTitle>
        <Button
          size="sm"
          variant={data ? "outline" : "default"}
          onClick={() => {
            reset();
            mutate();
          }}
          disabled={isPending}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isPending
            ? "Generating..."
            : data
              ? "Regenerate"
              : "Generate AI Summary"}
        </Button>
      </CardHeader>

      <CardContent className="flex-1">
        {isPending ? (
          <LoadingLine label="Generating summary..." />
        ) : isError ? (
          <ErrorState
            title={copy.title}
            detail={copy.detail}
            onRetry={copy.retry ? () => mutate() : undefined}
          />
        ) : data ? (
          <div className="space-y-4">
            <Section label="Who">{data.who}</Section>
            <Section label="What's important">{data.important}</Section>
            <Section label="What's happened">{data.history}</Section>
            <Section label="What's missing">
              {data.missing.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 marker:text-slate-400">
                  {data.missing.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-slate-500">
                  Nothing flagged as missing.
                </span>
              )}
            </Section>
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
              Generated from this lead&apos;s CRM record. Not stored — regenerate
              any time.
            </p>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">
              No summary yet.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Generate one to see who this lead is, what matters, and what
              you&apos;re still missing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
