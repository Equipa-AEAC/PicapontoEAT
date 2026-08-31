import type {
  Project,
  ProjectActivityEvent,
  ProjectActivityKind,
  ProjectBoardColumn,
  ProjectFilters,
  ProjectFormValues,
  ProjectOverview,
  ProjectParticipant,
  ProjectProgress,
  ProjectSummary,
  ProjectTask,
  ProjectTaskSummary,
  ProjectWorkloadRow,
  TaskFilters,
  TaskFormValues,
  TaskStatus,
} from "../types/projects";
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, UNASSIGNED_ASSIGNEE } from "../types/projects";
import type { UserRole } from "../types/users";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { formatDueLabel, todayIsoDate } from "../utils/date";

/**
 * Project management data access.
 *
 * Reads and writes `mockDatabase` through `mockRequest`, exactly like every other
 * service here. When the backend exposes the endpoints, each function body is
 * replaced with the matching `httpClient` call and nothing above this layer changes:
 *
 *   const { data } = await httpClient.get<ProjectSummary[]>("/projects", { params: filters });
 *   return data;
 *
 * Everything derived — progress, overdue flags, workload, the overview — is computed
 * here rather than stored, so a task moving column cannot leave a stale rollup behind.
 */

/** Who is performing a mutation. Recorded on the activity trail. */
export interface ProjectActor {
  id: string | null;
  name: string;
}

const DUE_SOON_DAYS = 7;
const RECENT_ACTIVITY_LIMIT = 12;
const RECENTLY_UPDATED_LIMIT = 5;

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, existing: Array<{ id: string }>): string {
  const highest = existing.reduce((max, item) => {
    const numeric = Number(item.id.replace(/^\D+/, ""));
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);

  return `${prefix}-${highest + 1}`;
}

/** Whole days from today to `date`. Negative once the date has passed. */
function daysUntil(date: string | null): number | null {
  if (!date) {
    return null;
  }

  const target = Date.parse(`${date}T00:00:00`);
  const today = Date.parse(`${todayIsoDate()}T00:00:00`);

  if (Number.isNaN(target)) {
    return null;
  }

  return Math.round((target - today) / 86_400_000);
}

/* ------------------------------------------------------------- Participants */

const STAFF_ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  coordinator: "Coordinator",
  teacher: "Teacher",
  viewer: "Viewer",
};

/**
 * Everyone who can be put on a project, assembled from the two person tables the
 * application already has: the member roster and the staff accounts.
 *
 * A staff account created *from* a member (it carries `memberId`) is skipped, so
 * that person appears once — as their roster entry — rather than twice.
 */
function buildParticipants(): ProjectParticipant[] {
  const members: ProjectParticipant[] = mockDatabase.members.map((member) => ({
    id: member.id,
    name: member.fullName,
    source: "member",
    role: member.internshipStatus === "not-assigned" ? "Team member" : "Intern",
    isExternal: member.isExternal,
  }));

  const staff: ProjectParticipant[] = mockDatabase.users
    .filter((user) => !user.memberId && user.status === "active")
    .map((user) => ({
      id: user.id,
      name: user.fullName,
      source: "user",
      role: STAFF_ROLE_LABELS[user.role],
      isExternal: false,
    }));

  return [...members, ...staff];
}

function participantById(id: string | null): ProjectParticipant | null {
  if (!id) {
    return null;
  }

  return buildParticipants().find((participant) => participant.id === id) ?? null;
}

export async function listProjectParticipants(): Promise<ProjectParticipant[]> {
  return mockRequest(() => cloneRecord(buildParticipants()));
}

/* ---------------------------------------------------------------- Activity */

function recordActivity(
  projectId: string,
  kind: ProjectActivityKind,
  summary: string,
  actor: ProjectActor,
  taskId: string | null = null,
) {
  mockDatabase.projectActivity.push({
    id: nextId("pac", mockDatabase.projectActivity),
    projectId,
    taskId,
    kind,
    summary,
    actorId: actor.id,
    actorName: actor.name,
    createdAt: nowIso(),
  });
}

function activityFor(projectId: string): ProjectActivityEvent[] {
  return mockDatabase.projectActivity
    .filter((event) => event.projectId === projectId)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

/* ------------------------------------------------------------------- Tasks */

function liveTasks(projectId?: string): ProjectTask[] {
  return mockDatabase.projectTasks.filter(
    (task) => !task.archivedAt && (projectId === undefined || task.projectId === projectId),
  );
}

function taskIsOverdue(task: ProjectTask): boolean {
  if (task.status === "done" || !task.dueDate) {
    return false;
  }

  const remaining = daysUntil(task.dueDate);
  return remaining !== null && remaining < 0;
}

function toTaskSummary(task: ProjectTask): ProjectTaskSummary {
  const participants = buildParticipants();
  const project = mockDatabase.projects.find((item) => item.id === task.projectId);
  const remaining = daysUntil(task.dueDate);

  return {
    ...task,
    projectName: project?.name ?? "Unknown project",
    assignees: task.assigneeIds
      .map((id) => participants.find((participant) => participant.id === id))
      .filter((participant): participant is ProjectParticipant => Boolean(participant)),
    isOverdue: taskIsOverdue(task),
    daysUntilDue: remaining,
    // A finished task has no deadline left to miss, so it never carries a label.
    dueLabel: task.status === "done" ? null : formatDueLabel(remaining),
  };
}

function computeProgress(tasks: ProjectTask[]): ProjectProgress {
  const done = tasks.filter((task) => task.status === "done").length;

  return {
    total: tasks.length,
    done,
    inProgress: tasks.filter((task) => task.status === "in-progress").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    overdue: tasks.filter(taskIsOverdue).length,
    percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
}

/* ---------------------------------------------------------------- Projects */

/**
 * Journal hours booked against a project.
 *
 * This is the join that stops project management from being a parallel universe:
 * the hours come from the daily entries members already write, not from a second
 * time-tracking mechanism nobody would fill in.
 */
function journalTotalsFor(projectId: string): { hours: number; entries: number } {
  const entries = mockDatabase.dailyLogs.filter((entry) => entry.projectId === projectId);

  return {
    hours: Number(entries.reduce((total, entry) => total + entry.hours, 0).toFixed(1)),
    entries: entries.length,
  };
}

function toProjectSummary(project: Project): ProjectSummary {
  const participants = buildParticipants();
  const tasks = liveTasks(project.id);
  const journal = journalTotalsFor(project.id);
  const events = activityFor(project.id);
  const remaining = daysUntil(project.deadline);

  return {
    ...project,
    participants: project.memberIds
      .map((id) => participants.find((participant) => participant.id === id))
      .filter((participant): participant is ProjectParticipant => Boolean(participant)),
    progress: computeProgress(tasks),
    journalHours: journal.hours,
    journalEntries: journal.entries,
    lastActivityAt: events[0]?.createdAt ?? project.updatedAt ?? project.createdAt,
    isOverdue: project.status !== "done" && project.status !== "archived" && remaining !== null && remaining < 0,
  };
}

export async function listProjects(filters: Partial<ProjectFilters> = {}): Promise<ProjectSummary[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    const matched = mockDatabase.projects.filter((project) => {
      const isArchived = project.status === "archived" || Boolean(project.archivedAt);
      if (isArchived && !filters.includeArchived) {
        return false;
      }

      const matchesQuery =
        query.length === 0 || [project.name, project.description, project.owner].join(" ").toLowerCase().includes(query);
      const matchesStatus = !filters.status || filters.status === "all" || project.status === filters.status;
      const matchesPriority = !filters.priority || filters.priority === "all" || project.priority === filters.priority;
      const matchesParticipant =
        !filters.participantId ||
        filters.participantId === "all" ||
        project.memberIds.includes(filters.participantId) ||
        project.ownerId === filters.participantId;

      return matchesQuery && matchesStatus && matchesPriority && matchesParticipant;
    });

    const summaries = matched.map(toProjectSummary);
    summaries.sort((first, second) => (second.lastActivityAt ?? "").localeCompare(first.lastActivityAt ?? ""));

    return cloneRecord(summaries);
  });
}

export async function getProject(projectId: string): Promise<ProjectSummary | null> {
  return mockRequest(() => {
    const project = mockDatabase.projects.find((item) => item.id === projectId);
    return project ? cloneRecord(toProjectSummary(project)) : null;
  });
}

export async function saveProject(values: ProjectFormValues, actor: ProjectActor, projectId?: string): Promise<Project> {
  return mockRequest(() => {
    const owner = participantById(values.ownerId);
    const existing = projectId ? mockDatabase.projects.find((item) => item.id === projectId) : undefined;

    if (existing) {
      const addedMembers = values.memberIds.filter((id) => !existing.memberIds.includes(id));
      const removedMembers = existing.memberIds.filter((id) => !values.memberIds.includes(id));

      Object.assign(existing, {
        ...values,
        owner: owner?.name ?? existing.owner,
        updatedAt: nowIso(),
      });

      recordActivity(existing.id, "project-updated", "Updated the project details", actor);

      if (addedMembers.length > 0) {
        const names = addedMembers.map((id) => participantById(id)?.name ?? id).join(", ");
        recordActivity(existing.id, "member-assigned", `Added ${names} to the project`, actor);
      }

      if (removedMembers.length > 0) {
        const names = removedMembers.map((id) => participantById(id)?.name ?? id).join(", ");
        recordActivity(existing.id, "member-removed", `Removed ${names} from the project`, actor);
      }

      return cloneRecord(existing);
    }

    const created: Project = {
      id: nextId("prj", mockDatabase.projects),
      ...values,
      owner: owner?.name ?? "Unassigned",
      createdAt: nowIso(),
      updatedAt: null,
      archivedAt: null,
    };

    mockDatabase.projects.push(created);
    recordActivity(created.id, "project-created", "Created the project", actor);

    return cloneRecord(created);
  });
}

/**
 * Archiving is reversible and keeps the project's tasks and activity intact — a
 * school year's work is a record, so nothing here deletes it.
 */
export async function archiveProject(projectId: string, actor: ProjectActor): Promise<Project | null> {
  return mockRequest(() => {
    const project = mockDatabase.projects.find((item) => item.id === projectId);

    if (!project) {
      return null;
    }

    project.status = "archived";
    project.archivedAt = nowIso();
    project.updatedAt = project.archivedAt;
    recordActivity(project.id, "project-archived", "Archived the project", actor);

    return cloneRecord(project);
  });
}

export async function restoreProject(projectId: string, actor: ProjectActor): Promise<Project | null> {
  return mockRequest(() => {
    const project = mockDatabase.projects.find((item) => item.id === projectId);

    if (!project) {
      return null;
    }

    project.status = "active";
    project.archivedAt = null;
    project.updatedAt = nowIso();
    recordActivity(project.id, "project-restored", "Restored the project from the archive", actor);

    return cloneRecord(project);
  });
}

/* ------------------------------------------------------------- Task access */

export async function listTasks(filters: Partial<TaskFilters> = {}): Promise<ProjectTaskSummary[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    const matched = mockDatabase.projectTasks.filter((task) => {
      if (task.archivedAt && !filters.includeArchived) {
        return false;
      }

      const matchesQuery = query.length === 0 || [task.title, task.description].join(" ").toLowerCase().includes(query);
      const matchesProject = !filters.projectId || filters.projectId === "all" || task.projectId === filters.projectId;
      const matchesStatus = !filters.status || filters.status === "all" || task.status === filters.status;
      const matchesPriority = !filters.priority || filters.priority === "all" || task.priority === filters.priority;
      const matchesAssignee =
        !filters.assigneeId ||
        filters.assigneeId === "all" ||
        (filters.assigneeId === UNASSIGNED_ASSIGNEE
          ? task.assigneeIds.length === 0
          : task.assigneeIds.includes(filters.assigneeId));

      const remaining = daysUntil(task.dueDate);
      const matchesDue =
        !filters.due ||
        filters.due === "all" ||
        (filters.due === "none" && !task.dueDate) ||
        (filters.due === "overdue" && taskIsOverdue(task)) ||
        (filters.due === "soon" &&
          task.status !== "done" &&
          remaining !== null &&
          remaining >= 0 &&
          remaining <= DUE_SOON_DAYS);

      return matchesQuery && matchesProject && matchesStatus && matchesPriority && matchesAssignee && matchesDue;
    });

    const summaries = matched.map(toTaskSummary);

    /*
     * Anything with a due date sorts before anything without one, earliest first.
     * A task with no deadline is not urgent by definition, so it belongs at the end.
     */
    summaries.sort((first, second) => {
      if (first.dueDate && second.dueDate) {
        return first.dueDate.localeCompare(second.dueDate);
      }

      if (first.dueDate) return -1;
      if (second.dueDate) return 1;

      return first.title.localeCompare(second.title);
    });

    return cloneRecord(summaries);
  });
}

export async function getProjectBoard(projectId: string): Promise<ProjectBoardColumn[]> {
  return mockRequest(() => {
    const tasks = liveTasks(projectId).map(toTaskSummary);

    const columns = TASK_STATUS_ORDER.map((status) => ({
      status,
      label: TASK_STATUS_LABELS[status],
      tasks: tasks.filter((task) => task.status === status).sort((first, second) => first.order - second.order),
    }));

    return cloneRecord(columns);
  });
}

export async function saveTask(values: TaskFormValues, actor: ProjectActor, taskId?: string): Promise<ProjectTask> {
  return mockRequest(() => {
    const existing = taskId ? mockDatabase.projectTasks.find((item) => item.id === taskId) : undefined;

    if (existing) {
      const statusChanged = existing.status !== values.status;
      const assigneesChanged = existing.assigneeIds.join(",") !== values.assigneeIds.join(",");

      Object.assign(existing, values, {
        updatedAt: nowIso(),
        completedAt: values.status === "done" ? (existing.completedAt ?? nowIso()) : null,
      });

      if (statusChanged) {
        recordActivity(
          existing.projectId,
          "task-status-changed",
          `Moved "${existing.title}" to ${TASK_STATUS_LABELS[existing.status]}`,
          actor,
          existing.id,
        );
      } else {
        recordActivity(existing.projectId, "task-updated", `Updated "${existing.title}"`, actor, existing.id);
      }

      if (assigneesChanged) {
        const names = values.assigneeIds.map((id) => participantById(id)?.name ?? id).join(", ");
        recordActivity(
          existing.projectId,
          "task-assigned",
          names ? `Assigned "${existing.title}" to ${names}` : `Unassigned "${existing.title}"`,
          actor,
          existing.id,
        );
      }

      touchProject(existing.projectId);

      return cloneRecord(existing);
    }

    const siblings = liveTasks(values.projectId).filter((task) => task.status === values.status);

    const created: ProjectTask = {
      id: nextId("tsk", mockDatabase.projectTasks),
      ...values,
      createdAt: nowIso(),
      createdBy: actor.name,
      updatedAt: null,
      completedAt: values.status === "done" ? nowIso() : null,
      archivedAt: null,
      order: siblings.length,
    };

    mockDatabase.projectTasks.push(created);
    recordActivity(created.projectId, "task-created", `Created "${created.title}"`, actor, created.id);
    touchProject(created.projectId);

    return cloneRecord(created);
  });
}

/**
 * The board's drag target and the list's inline status control both land here, so a
 * status change never has to go through the full edit form.
 */
export async function updateTaskStatus(taskId: string, status: TaskStatus, actor: ProjectActor): Promise<ProjectTask | null> {
  return mockRequest(() => {
    // Guard the write, not just the picker. A caller that hands over a status
    // outside the enum would otherwise persist it, and every board column,
    // progress figure and overdue check downstream reads it back as garbage.
    if (!TASK_STATUS_ORDER.includes(status)) {
      throw new Error(`"${status}" is not a task status.`);
    }

    const task = mockDatabase.projectTasks.find((item) => item.id === taskId);

    if (!task || task.status === status) {
      return task ? cloneRecord(task) : null;
    }

    task.status = status;
    task.updatedAt = nowIso();
    task.completedAt = status === "done" ? nowIso() : null;
    task.order = liveTasks(task.projectId).filter((item) => item.status === status && item.id !== task.id).length;

    recordActivity(
      task.projectId,
      "task-status-changed",
      `Moved "${task.title}" to ${TASK_STATUS_LABELS[status]}`,
      actor,
      task.id,
    );
    touchProject(task.projectId);

    return cloneRecord(task);
  });
}

export async function assignTask(taskId: string, assigneeIds: string[], actor: ProjectActor): Promise<ProjectTask | null> {
  return mockRequest(() => {
    const task = mockDatabase.projectTasks.find((item) => item.id === taskId);

    if (!task) {
      return null;
    }

    task.assigneeIds = [...assigneeIds];
    task.updatedAt = nowIso();

    const names = assigneeIds.map((id) => participantById(id)?.name ?? id).join(", ");
    recordActivity(
      task.projectId,
      "task-assigned",
      names ? `Assigned "${task.title}" to ${names}` : `Unassigned "${task.title}"`,
      actor,
      task.id,
    );
    touchProject(task.projectId);

    return cloneRecord(task);
  });
}

/** Tasks are archived rather than deleted, for the same reason projects are. */
export async function archiveTask(taskId: string, actor: ProjectActor): Promise<void> {
  return mockRequest(() => {
    const task = mockDatabase.projectTasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    task.archivedAt = nowIso();
    task.updatedAt = task.archivedAt;
    recordActivity(task.projectId, "task-archived", `Archived "${task.title}"`, actor, task.id);
    touchProject(task.projectId);
  });
}

function touchProject(projectId: string) {
  const project = mockDatabase.projects.find((item) => item.id === projectId);

  if (project) {
    project.updatedAt = nowIso();
  }
}

/* ---------------------------------------------------------------- Timeline */

export async function listProjectActivity(projectId?: string, limit?: number): Promise<ProjectActivityEvent[]> {
  return mockRequest(() => {
    const events = [...mockDatabase.projectActivity]
      .filter((event) => !projectId || event.projectId === projectId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

    return cloneRecord(limit ? events.slice(0, limit) : events);
  });
}

/* --------------------------------------------------------------- Workload */

function buildWorkload(): ProjectWorkloadRow[] {
  const tasks = liveTasks();

  return buildParticipants()
    .map((participant) => {
      const assigned = tasks.filter((task) => task.assigneeIds.includes(participant.id));
      const projectIds = new Set(assigned.map((task) => task.projectId));

      /*
       * Journal hours are only recorded for members, so staff participants show
       * zero here rather than a misleading blank — they are on projects, they just
       * do not write daily entries.
       */
      const hours = mockDatabase.dailyLogs
        .filter((entry) => entry.studentId === participant.id && entry.projectId)
        .reduce((total, entry) => total + entry.hours, 0);

      return {
        participant,
        assigned: assigned.length,
        open: assigned.filter((task) => task.status !== "done").length,
        done: assigned.filter((task) => task.status === "done").length,
        overdue: assigned.filter(taskIsOverdue).length,
        projects: projectIds.size,
        hours: Number(hours.toFixed(1)),
      };
    })
    .sort((first, second) => second.open - first.open || second.assigned - first.assigned);
}

export async function getProjectWorkload(): Promise<ProjectWorkloadRow[]> {
  return mockRequest(() => cloneRecord(buildWorkload()));
}

/* ---------------------------------------------------------------- Overview */

export async function getProjectOverview(): Promise<ProjectOverview> {
  return mockRequest(() => {
    const projects = mockDatabase.projects;
    const tasks = liveTasks();
    const summaries = tasks.map(toTaskSummary);

    const dueSoon = summaries.filter(
      (task) =>
        task.status !== "done" && task.daysUntilDue !== null && task.daysUntilDue >= 0 && task.daysUntilDue <= DUE_SOON_DAYS,
    );

    const recentlyUpdated = [...projects]
      .filter((project) => project.status !== "archived")
      .map(toProjectSummary)
      .sort((first, second) => (second.lastActivityAt ?? "").localeCompare(first.lastActivityAt ?? ""))
      .slice(0, RECENTLY_UPDATED_LIMIT);

    const overview: ProjectOverview = {
      activeProjects: projects.filter((project) => project.status === "active").length,
      plannedProjects: projects.filter((project) => project.status === "planned").length,
      completedProjects: projects.filter((project) => project.status === "done").length,
      archivedProjects: projects.filter((project) => project.status === "archived").length,
      openTasks: tasks.filter((task) => task.status !== "done").length,
      overdueTasks: summaries.filter((task) => task.isOverdue),
      dueSoonTasks: dueSoon,
      unassignedTasks: tasks.filter((task) => task.status !== "done" && task.assigneeIds.length === 0).length,
      statusBreakdown: TASK_STATUS_ORDER.map((status) => ({
        status,
        label: TASK_STATUS_LABELS[status],
        count: tasks.filter((task) => task.status === status).length,
      })),
      recentActivity: [...mockDatabase.projectActivity]
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
        .slice(0, RECENT_ACTIVITY_LIMIT),
      recentlyUpdated,
      workload: buildWorkload(),
    };

    return cloneRecord(overview);
  });
}

/** Tasks assigned to one person, used for the "assigned to me" panel. */
export async function listTasksForParticipant(participantId: string): Promise<ProjectTaskSummary[]> {
  return mockRequest(() =>
    cloneRecord(
      liveTasks()
        .filter((task) => task.assigneeIds.includes(participantId) && task.status !== "done")
        .map(toTaskSummary)
        .sort((first, second) => (first.dueDate ?? "9999").localeCompare(second.dueDate ?? "9999")),
    ),
  );
}
