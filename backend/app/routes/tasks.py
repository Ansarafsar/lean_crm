import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.logging_config import truncate
from app.models import Lead, Task
from app.routes.deps import get_lead_or_404
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tasks"])


@router.get("/api/leads/{lead_id}/tasks", response_model=list[TaskOut])
def list_tasks(lead: Lead = Depends(get_lead_or_404), db: Session = Depends(get_db)):
    stmt = (
        select(Task)
        .where(Task.lead_id == lead.id)
        # Open work first, soonest due first; undated tasks fall to the end.
        .order_by(
            Task.completed.asc(),
            Task.due_date.is_(None).asc(),
            Task.due_date.asc(),
            Task.id.asc(),
        )
    )
    return db.execute(stmt).scalars().all()


@router.post(
    "/api/leads/{lead_id}/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    payload: TaskCreate,
    lead: Lead = Depends(get_lead_or_404),
    db: Session = Depends(get_db),
):
    task = Task(lead_id=lead.id, title=payload.title, due_date=payload.due_date)
    db.add(task)
    db.commit()
    db.refresh(task)

    logger.info(
        "task created lead=%s task=%s title=%r due=%s",
        lead.id,
        task.id,
        truncate(task.title),
        task.due_date,
    )
    return task


@router.patch("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(
    payload: TaskUpdate,
    task_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")

    fields = payload.model_dump(exclude_unset=True)

    if "completed" in fields and fields["completed"] is not None:
        task.completed = fields["completed"]
        task.completed_at = datetime.now(timezone.utc) if task.completed else None

    if fields.get("title") is not None:
        if not fields["title"].strip():
            raise HTTPException(status_code=400, detail="Task title cannot be empty.")
        task.title = fields["title"].strip()

    if "due_date" in fields:
        task.due_date = fields["due_date"]

    db.commit()
    db.refresh(task)

    logger.info(
        "task updated lead=%s task=%s completed=%s", task.lead_id, task.id, task.completed
    )
    return task
