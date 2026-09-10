"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useCreateTask, useTasks, useToggleTask } from "@/hooks/useCrm";
import { cn, formatDueDate, isOverdue } from "@/lib/utils";

function AddTaskDialog({ leadId }: { leadId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const create = useCreateTask(leadId);
  const blank = title.trim().length === 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blank) return;
    create.mutate(
      { title, due_date: dueDate || null },
      {
        onSuccess: () => {
          setTitle("");
          setDueDate("");
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
          Add Task
        </Button>
      </DialogTrigger>

      <DialogContent title="Create task" description="Keep the next action visible.">
        <form onSubmit={submit}>
          <div className="mb-4">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Send pricing proposal"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {create.isError ? (
            <p className="mb-3 text-sm text-rose-600">
              Couldn&apos;t create the task. Please try again.
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
              {create.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskList({ leadId }: { leadId: number }) {
  const { data, isPending, isError, refetch } = useTasks(leadId);
  const toggle = useToggleTask(leadId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Tasks</CardTitle>
        <AddTaskDialog leadId={leadId} />
      </CardHeader>

      <CardContent>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Unable to load tasks." onRetry={() => refetch()} />
        ) : data && data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <label className="flex min-w-0 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled={toggle.isPending}
                    onChange={(e) =>
                      toggle.mutate({
                        taskId: task.id,
                        completed: e.target.checked,
                      })
                    }
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:opacity-50"
                  />
                  <span
                    className={cn(
                      "truncate text-sm",
                      task.completed
                        ? "text-slate-400 line-through"
                        : "text-slate-800",
                    )}
                  >
                    {task.title}
                  </span>
                </label>
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    task.completed
                      ? "text-slate-400"
                      : isOverdue(task.due_date)
                        ? "font-medium text-rose-600"
                        : "text-slate-500",
                  )}
                >
                  {formatDueDate(task.due_date)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No follow-up tasks."
            hint="Create a task to keep the next action visible."
          />
        )}

        {toggle.isError ? (
          <p className="mt-3 text-sm text-rose-600">
            Couldn&apos;t update the task. Please try again.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
