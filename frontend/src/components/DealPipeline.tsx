"use client";

import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useDeal, useUpdateDealStage } from "@/hooks/useCrm";
import { ApiError } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES, type DealStage } from "@/types";

export function DealPipeline({ leadId }: { leadId: number }) {
  const { data: deal, isPending, isError, error, refetch } = useDeal(leadId);
  const updateStage = useUpdateDealStage(leadId);

  // A lead with no deal is a normal state, not a failure.
  const noDeal = isError && error instanceof ApiError && error.status === 404;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal</CardTitle>
        {deal ? (
          <span className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(deal.value, deal.currency)}
          </span>
        ) : null}
      </CardHeader>

      <CardContent>
        {isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : noDeal ? (
          <EmptyState title="No deal on this lead yet." />
        ) : isError ? (
          <ErrorState
            title="Unable to load the deal."
            onRetry={() => refetch()}
          />
        ) : deal ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              {PIPELINE_STAGES.map((stage, index) => {
                const currentIndex = PIPELINE_STAGES.indexOf(deal.stage);
                const isCurrent = deal.stage === stage;
                const isPassed = currentIndex > index && currentIndex !== -1;

                return (
                  <div key={stage} className="flex items-center">
                    <button
                      onClick={() =>
                        updateStage.mutate({ dealId: deal.id, stage })
                      }
                      disabled={updateStage.isPending || isCurrent}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:cursor-default",
                        isCurrent
                          ? "bg-slate-900 text-white"
                          : isPassed
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                            : "bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-100",
                        updateStage.isPending && "opacity-60",
                      )}
                    >
                      {stage}
                    </button>
                    {index < PIPELINE_STAGES.length - 1 ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                Current stage:{" "}
                <span className="font-medium capitalize text-slate-700">
                  {deal.stage}
                </span>
              </span>
              <button
                onClick={() =>
                  updateStage.mutate({
                    dealId: deal.id,
                    stage: (deal.stage === "lost" ? "new" : "lost") as DealStage,
                  })
                }
                disabled={updateStage.isPending}
                className="text-rose-600 underline-offset-2 hover:underline disabled:opacity-50"
              >
                {deal.stage === "lost" ? "Reopen deal" : "Mark as lost"}
              </button>
            </div>

            {updateStage.isError ? (
              <p className="mt-3 text-sm text-rose-600">
                Couldn&apos;t update the stage. Please try again.
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
