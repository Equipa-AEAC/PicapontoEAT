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
import { TASK_STATUS_ORDER, UNASSIGNED_ASSIGNEE } from "../types/projects";
import type { MemberProjectRights } from "../types/projectPermissions";
import {
  assignmentTouchesOthers,
  memberCanEditTask,
  memberCanRemoveTask,
  memberProjectRights,
  resolveAssigneeIds,
  toAccessShape,
  toOwnershipShape,
} from "../types/projectPermissions";
import type { UserRole } from "../types/users";

import { appendAuditLog } from "./audit.service";
import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { formatDueLabel, todayIsoDate } from "../utils/date";
import { t } from "../i18n";

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

/**
 * English names for the statuses, used only for the `summary` written into an
 * activity or audit row.
 *
 * The interface never reads these - it renders `messageKey` through the active
 * language. They exist so a stored record and an export still say something in
 * the project's development language rather than a bare enum member, which is
 * the same role this text will have once a real backend writes it.
 */
const EN_TASK_STATUS: Record<TaskStatus, string> = {
  todo: "To do",
  "in-progress": "In progress",
  blocked: "Blocked",
  review: "In review",
  done: "Done",
};

const EN_PROJECT_STATUS: Record<string, string> = {
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  done: "Completed",
  archived: "Archived",
};

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

/*
 * A participant's standing is recorded as a translation key, not as a word.
 *
 * The service has no language: it knows this person is an intern, not how to
 * write "intern" for whoever is looking. The view translates it - see
 * `i18n/vocabulary.ts`.
 */
const STAFF_ROLE_KEYS: Record<UserRole, string> = {
  administrator: "projects.participantRole.administrator",
  coordinator: "projects.participantRole.coordinator",
  teacher: "projects.participantRole.teacher",
  viewer: "projects.participantRole.viewer",
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
    role:
      member.internshipStatus === "not-assigned"
        ? "projects.participantRole.teamMember"
        : "projects.participantRole.intern",
    isExternal: member.isExternal,
  }));

  const staff: ProjectParticipant[] = mockDatabase.users
    .filter((user) => !user.memberId && user.status === "active")
    .map((user) => ({
      id: user.id,
      name: user.fullName,
      source: "user",
      role: STAFF_ROLE_KEYS[user.role],
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

/**
 * Which project events also belong in the system-wide audit trail.
 *
 * The two records answer different questions and must not be collapsed into
 * one. The per-project timeline is the story of a project and wants everything,
 * including every drag across the board. The audit trail is what somebody is
 * asked to produce when a decision is questioned, and a page of "Moved X to In
 * progress" would bury the entries that matter — so status moves and field edits
 * on a task stay in the timeline only.
 *
 * What reaches the audit log is the set of acts with consequences outside the
 * board: a project existing, changing, being archived or restored, and work
 * being created, assigned or taken off the board.
 */
const AUDITED_PROJECT_EVENTS = new Set<ProjectActivityKind>([
  "project-created",
  "project-updated",
  "project-archived",
  "project-restored",
  "task-created",
  "task-assigned",
  "task-archived",
  "member-assigned",
  "member-removed",
]);

/**
 * Append one event to a project's timeline.
 *
 * `summary` is the English sentence and is what a stored record or an export
 * carries; `messageKey` plus `params` is the same sentence in a form the
 * interface can render in whichever language is on screen. Both are written,
 * because the feed is read for a whole school year and the language it is read
 * in is not the language it was written in.
 */
function recordActivity(
  projectId: string,
  kind: ProjectActivityKind,
  summary: string,
  actor: ProjectActor,
  taskId: string | null = null,
  message: { key: string; params: Record<string, string> } | null = null,
) {
  mockDatabase.projectActivity.push({
    id: nextId("pac", mockDatabase.projectActivity),
    projectId,
    taskId,
    kind,
    summary,
    messageKey: message?.key ?? null,
    messageParams: message?.params ?? null,
    actorId: actor.id,
    actorName: actor.name,
    createdAt: nowIso(),
  });

  if (!AUDITED_PROJECT_EVENTS.has(kind)) {
    return;
  }

  const projectName = mockDatabase.projects.find((item) => item.id === projectId)?.name ?? projectId;

  /*
   * Reuses `appendAuditLog` rather than writing to `auditLogs` directly, so
   * project entries are indistinguishable in shape from every other audited
   * decision and the Audit page's filters pick them up with no special case.
   */
  appendAuditLog({
    userName: actor.name,
    action: kind.endsWith("-created") ? "CREATE" : kind.endsWith("-archived") ? "DELETE" : "UPDATE",
    entity: kind.startsWith("task-") ? "project-task" : "project",
    description: `${projectName}: ${summary}.`,
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

      const statusChanged = existing.status !== values.status;
      const previousStatus = existing.status;

      Object.assign(existing, {
        ...values,
        owner: owner?.name ?? existing.owner,
        updatedAt: nowIso(),
      });

      /*
       * A status change is the one project edit somebody asks about later, so it
       * is named in the summary rather than folded into "updated the details".
       */
      recordActivity(
        existing.id,
        "project-updated",
        statusChanged
          ? `Status changed from ${EN_PROJECT_STATUS[previousStatus]} to ${EN_PROJECT_STATUS[values.status]}`
          : "Updated the project details",
        actor,
        null,
        statusChanged
          ? {
              key: "projects.activity.projectStatusChanged",
              params: { fromStatus: previousStatus, toStatus: values.status },
            }
          : { key: "projects.activity.projectUpdated", params: {} },
      );

      if (addedMembers.length > 0) {
        const names = addedMembers.map((id) => participantById(id)?.name ?? id).join(", ");
        recordActivity(existing.id, "member-assigned", `Added ${names} to the project`, actor, null, {
          key: "projects.activity.memberAssigned",
          params: { names },
        });
      }

      if (removedMembers.length > 0) {
        const names = removedMembers.map((id) => participantById(id)?.name ?? id).join(", ");
        recordActivity(existing.id, "member-removed", `Removed ${names} from the project`, actor, null, {
          key: "projects.activity.memberRemoved",
          params: { names },
        });
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
    recordActivity(created.id, "project-created", "Created the project", actor, null, {
      key: "projects.activity.projectCreated",
      params: {},
    });

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
    recordActivity(project.id, "project-archived", "Archived the project", actor, null, {
      key: "projects.activity.projectArchived",
      params: {},
    });

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
    recordActivity(project.id, "project-restored", "Restored the project from the archive", actor, null, {
      key: "projects.activity.projectRestored",
      params: {},
    });

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
          `Moved "${existing.title}" to ${EN_TASK_STATUS[existing.status]}`,
          actor,
          existing.id,
          { key: "projects.activity.taskStatusChanged", params: { title: existing.title, status: existing.status } },
        );
      } else {
        recordActivity(existing.projectId, "task-updated", `Updated "${existing.title}"`, actor, existing.id, {
          key: "projects.activity.taskUpdated",
          params: { title: existing.title },
        });
      }

      if (assigneesChanged) {
        const names = values.assigneeIds.map((id) => participantById(id)?.name ?? id).join(", ");
        recordActivity(
          existing.projectId,
          "task-assigned",
          names ? `Assigned "${existing.title}" to ${names}` : `Unassigned "${existing.title}"`,
          actor,
          existing.id,
          names
            ? { key: "projects.activity.taskAssigned", params: { title: existing.title, names } }
            : { key: "projects.activity.taskUnassigned", params: { title: existing.title } },
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
      createdById: actor.id,
      updatedAt: null,
      completedAt: values.status === "done" ? nowIso() : null,
      archivedAt: null,
      order: siblings.length,
    };

    mockDatabase.projectTasks.push(created);
    recordActivity(created.projectId, "task-created", `Created "${created.title}"`, actor, created.id, {
      key: "projects.activity.taskCreated",
      params: { title: created.title },
    });
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
      `Moved "${task.title}" to ${EN_TASK_STATUS[status]}`,
      actor,
      task.id,
      { key: "projects.activity.taskStatusChanged", params: { title: task.title, status } },
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
      names
        ? { key: "projects.activity.taskAssigned", params: { title: task.title, names } }
        : { key: "projects.activity.taskUnassigned", params: { title: task.title } },
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
    recordActivity(task.projectId, "task-archived", `Archived "${task.title}"`, actor, task.id, {
      key: "projects.activity.taskArchived",
      params: { title: task.title },
    });
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

/**
 * Everything one member can see of the project workspace.
 *
 * The student side is not a smaller copy of the admin board: it is the same
 * records narrowed to the person looking at them. `listProjects` already filters
 * by participant, so this reuses it rather than re-implementing the membership
 * rule — the two must agree about what "on a project" means or the Student
 * Projects page and the admin Team page will disagree about the same person.
 *
 * Tasks include completed ones here, unlike `listTasksForParticipant`, because a
 * project view that hides finished work cannot show progress.
 *
 * BACKEND CONTRACT: `memberId` comes from the client. The API must take it from
 * the session and refuse a request for anybody else's workspace — filtering in
 * the browser is presentation, not authorization.
 */
export async function getMemberProjectWorkspace(memberId: string): Promise<{
  projects: ProjectSummary[];
  tasks: ProjectTaskSummary[];
  /** What the member may do on each project, keyed by project id. */
  rights: Record<string, MemberProjectRights>;
}> {
  return mockRequest(() => {
    const projects = mockDatabase.projects
      .filter(
        (project) =>
          (project.ownerId === memberId || project.memberIds.includes(memberId)) &&
          project.status !== "archived" &&
          !project.archivedAt,
      )
      .map(toProjectSummary);

    const projectIds = new Set(projects.map((project) => project.id));

    /*
     * A task assigned to the member counts even when its project does not list
     * them as a participant — being given work is itself a relationship to the
     * project, and hiding it would leave a task on their list with no context.
     */
    const tasks = liveTasks()
      .filter((task) => task.assigneeIds.includes(memberId))
      .map(toTaskSummary);

    for (const task of tasks) {
      if (!projectIds.has(task.projectId)) {
        const project = mockDatabase.projects.find((item) => item.id === task.projectId);

        if (project && !project.archivedAt) {
          projects.push(toProjectSummary(project));
          projectIds.add(project.id);
        }
      }
    }

    projects.sort((first, second) => (second.lastActivityAt ?? "").localeCompare(first.lastActivityAt ?? ""));
    tasks.sort((first, second) => (first.dueDate ?? "9999").localeCompare(second.dueDate ?? "9999"));

    /*
     * Rights travel with the list, not just with the project page. My tasks
     * renders an Edit button next to work on five different projects, and the
     * answer differs per project - the member may lead one and merely take part
     * in another.
     */
    const rights: Record<string, MemberProjectRights> = {};

    for (const project of projects) {
      rights[project.id] = getMemberProjectRights(memberId, project.id);
    }

    return cloneRecord({ projects, tasks, rights });
  });
}

/* ------------------------------------------------- Member-scoped access */

/**
 * What one member may do on one project.
 *
 * `types/projectPermissions.ts` states the rules; this resolves the inputs they
 * need out of the database. Everything member-facing below goes through it, so
 * the rights the interface renders and the rights the writes enforce are the
 * same object computed the same way.
 */
export function getMemberProjectRights(memberId: string, projectId: string): MemberProjectRights {
  const project = mockDatabase.projects.find((item) => item.id === projectId);

  if (!project || project.archivedAt || project.status === "archived") {
    return memberProjectRights(memberId, null);
  }

  const holdsTask = liveTasks(projectId).some((task) => task.assigneeIds.includes(memberId));

  return memberProjectRights(memberId, toAccessShape(project), holdsTask);
}

/**
 * Whether one member is entitled to open one project.
 *
 * A member belongs to a project by being its owner, by being on its participant
 * list, or by holding a task on its board - the same three relationships
 * `getMemberProjectWorkspace` uses, stated once so the list a student sees and
 * the project they may open cannot disagree.
 *
 * Archived projects are excluded: they are history, and the student workspace
 * has no restore action to offer.
 */
export function memberCanAccessProject(memberId: string, projectId: string): boolean {
  return getMemberProjectRights(memberId, projectId).canOpen;
}

/**
 * One project as a member may see it: the record, its board, its people, its
 * timeline, and what this member is allowed to do with them.
 *
 * This **refuses** rather than returning an empty board when the member is not
 * on the project. Returning nothing would be indistinguishable from a project
 * with no tasks, and the page would show an empty board for somebody else's work.
 *
 * BACKEND CONTRACT: the refusal below runs in the browser against a `memberId`
 * the client supplies, which makes it a correctness guard, not authorization.
 * The API must take the member from the session and apply the same rules
 * server-side. See docs/ai/BACKEND_CONTRACTS.md - Student project access.
 */
export async function getMemberProjectDetail(
  memberId: string,
  projectId: string,
): Promise<{
  project: ProjectSummary;
  board: ProjectBoardColumn[];
  participants: ProjectParticipant[];
  activity: ProjectActivityEvent[];
  rights: MemberProjectRights;
}> {
  return mockRequest(() => {
    const rights = getMemberProjectRights(memberId, projectId);

    if (!rights.canOpen) {
      throw new Error(t("errors.notOnProject"));
    }

    const project = mockDatabase.projects.find((item) => item.id === projectId)!;
    const tasks = liveTasks(projectId).map(toTaskSummary);

    const board = TASK_STATUS_ORDER.map((status) => ({
      status,
      tasks: tasks.filter((task) => task.status === status).sort((first, second) => first.order - second.order),
    }));

    /*
     * Participants are narrowed to the project's own people. A student picking an
     * assignee should not be shown the entire staff directory - and offering
     * somebody who is not on the project would create work nobody agreed to.
     *
     * Note this is *who exists on the project*, not *who this member may assign*:
     * a member without `canAssignOthers` is never shown a picker at all. The list
     * is still needed to render who a task belongs to.
     */
    const participants = buildParticipants().filter(
      (participant) => project.memberIds.includes(participant.id) || project.ownerId === participant.id,
    );

    return cloneRecord({
      project: toProjectSummary(project),
      board,
      participants,
      activity: activityFor(projectId).slice(0, RECENT_ACTIVITY_LIMIT),
      rights,
    });
  });
}

/**
 * A member creating or editing a task on a project they are on.
 *
 * Three separate checks, because they are three separate permissions:
 *
 * 1. the member must be on the project the task is going to;
 * 2. an *edit* is only allowed on a task that is theirs, unless they lead the
 *    project;
 * 3. the assignee list is rewritten to what they are actually allowed to send -
 *    a member who cannot assign others may only add or remove themselves, and
 *    everybody else's assignment is carried across untouched.
 *
 * Step 3 rewrites rather than rejects on purpose. The form never offers the
 * control, so a payload that touches other people is either a stale client or a
 * hand-made request; silently preserving the truth is better than failing a save
 * the member had no way to understand.
 */
export async function saveMemberTask(
  memberId: string,
  values: TaskFormValues,
  actor: ProjectActor,
  taskId?: string,
): Promise<ProjectTask> {
  const rights = getMemberProjectRights(memberId, values.projectId);

  if (!rights.canOpen) {
    throw new Error(t("errors.notOnProject"));
  }

  const existing = taskId ? mockDatabase.projectTasks.find((task) => task.id === taskId) : undefined;

  if (taskId) {
    if (!existing || !memberCanAccessProject(memberId, existing.projectId)) {
      throw new Error(t("errors.taskNotYours"));
    }

    if (!memberCanEditTask(rights, memberId, toOwnershipShape(existing))) {
      throw new Error(t("errors.taskEditOwnOnly"));
    }
  }

  if (!rights.canCreateTask && !existing) {
    throw new Error(t("errors.notOnProject"));
  }

  const assigneeIds = resolveAssigneeIds({
    rights,
    memberId,
    requested: values.assigneeIds,
    existing: existing?.assigneeIds ?? [],
  });

  return saveTask({ ...values, assigneeIds }, actor, taskId);
}

/**
 * A member moving a task on a board they may see.
 *
 * Moving is open to everybody on the project, unlike editing. A board whose
 * cards only their owner may drag is not a shared board, and a status change is
 * both reversible and written to the timeline with the member's name on it.
 */
export async function moveMemberTaskStatus(
  memberId: string,
  taskId: string,
  status: TaskStatus,
  actor: ProjectActor,
): Promise<ProjectTask | null> {
  const task = mockDatabase.projectTasks.find((item) => item.id === taskId);

  if (!task) {
    throw new Error(t("errors.taskNotYours"));
  }

  const rights = getMemberProjectRights(memberId, task.projectId);

  if (!rights.canMoveTasks) {
    throw new Error(t("errors.taskNotYours"));
  }

  return updateTaskStatus(taskId, status, actor);
}

/**
 * A member removing a task.
 *
 * Archived, not deleted - the same rule the admin workspace follows, so a task
 * removed by a student is recoverable by staff rather than gone. Allowed on the
 * member's own tasks; anybody else's needs the project owner or a task
 * coordinator, because withdrawing work somebody is relying on is not a
 * participant's decision to make.
 */
export async function archiveMemberTask(
  memberId: string,
  taskId: string,
  actor: ProjectActor,
): Promise<void> {
  const task = mockDatabase.projectTasks.find((item) => item.id === taskId);

  if (!task) {
    throw new Error(t("errors.taskNotYours"));
  }

  const rights = getMemberProjectRights(memberId, task.projectId);

  if (!rights.canOpen) {
    throw new Error(t("errors.taskNotYours"));
  }

  if (!memberCanRemoveTask(rights, memberId, toOwnershipShape(task))) {
    throw new Error(t("errors.taskRemoveOwnOnly"));
  }

  return archiveTask(taskId, actor);
}

/**
 * Assignment guard for callers outside the board.
 *
 * Exported so the store can answer "would this change touch somebody else?"
 * without duplicating the comparison. Re-exported from the permission module
 * rather than reimplemented, for the usual reason.
 */
export { assignmentTouchesOthers };
