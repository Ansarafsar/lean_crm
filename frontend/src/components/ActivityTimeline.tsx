"use client";

import { Mail, MessageSquare, Phone, Plus, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useActivities, useCreateActivity } from "@/hooks/useCrm";
import { formatFullTimestamp } from "@/lib/utils";
import { ACTIVITY_TYPES, type ActivityType } from "@/types";

const ICONS: Record<ActivityType, typeof Phone> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
};

function AddActivityDialog({ leadId }: { leadId: number }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>("note");
  const [content, setContent] = useState("");

  const create = useCreateActivity(leadId);
  const blank = content.trim().length === 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blank) return;
    create.mutate(
      { type, content },
      {
        onSuccess: () => {
          setContent("");
          setType("note");
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) create.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" />
          Add Activity
        </Button>
      </DialogTrigger>

      <DialogContent title="Add activity" description="Log an interaction with this lead.">
        <form onSubmit={submit}>
          <div className="mb-4">
            <Label htmlFor="activity-type">Activity type</Label>
            <Select
              id="activity-type"
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="mb-4">
            <Label htmlFor="activity-content">Description</Label>
            <Textarea
              id="activity-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened?"
              autoFocus
            />
          </div>

          {create.isError ? (
            <p className="mb-3 text-sm text-rose-600">
              Couldn&apos;t add activity. {(create.error as Error).message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={blank || create.isPending}>
              {create.isPending ? "Adding..." : "Add Activity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityTimeline({ leadId }: { leadId: number }) {
  const { data, isPending, isError, refetch } = useActivities(leadId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <AddActivityDialog leadId={leadId} />
      </CardHeader>

      <CardContent>
        {isPending ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Unable to load activity."
            onRetry={() => refetch()}
          />
        ) : data && data.length > 0 ? (
          <ol className="space-y-5">
            {data.map((activity) => {
              const Icon = ICONS[activity.type] ?? MessageSquare;
              return (
                <li key={activity.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{activity.type}</Badge>
                      <span className="text-xs text-slate-400">
                        {formatFullTimestamp(activity.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                      {activity.content}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            title="No activities yet."
            hint="Add the first interaction with this lead."
          />
        )}
      </CardContent>
    </Card>
  );
}
