/**
 * Project management.
 *
 * This grows out of the `Project` record the daily journal already tagged entries
 * against — the id space is unchanged, so every existing `DailyLogEntry.projectId`
 * keeps resolving. What is added is the rest of a project: who is on it, what the
 * work items are, when they are due and what has happened to them.
 *
 * People are never duplicated here. A project participant is a reference to a row
 * that already exists, either on the member roster or on a staff account, and the
 * `source` field records which.
 */

export type ProjectStatus = "planned" | "active" | "paused" | "done" | "archived";

export type ProjectPriority = "low" | "normal" | "high" | "critical";

export type TaskStatus = "todo" | "in-progress" | "blocked" | "review" | "done";

/*
 * Enumeration *order* lives here; the words do not.
 *
 * These used to be `Record<Status, string>` label maps. A module constant is
 * evaluated once at load, which cannot survive a language change, so the labels
 * moved to `i18n/vocabulary.ts` as functions and only the ordering — which is a
 * product decision, not a translation — stayed behind.
 */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = ["planned", "active", "paused", "done", "archived"];

export const PROJECT_PRIORITY_ORDER: ProjectPriority[] = ["low", "normal", "high", "critical"];

/** Board column order. Also the order statuses are listed in every select. */
export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "blocked", "review", "done"];

/**
 * Somebody who can be put on a project or a task.
 *
 * Deliberately not a stored entity — it is assembled at read time from the member
 * roster and the staff accounts, so a coordinator or a teacher can be assigned work
 * without them having to appear on the student roster, and nobody is ever recorded
 * twice. `id` is the id of the underlying row; member and user ids never collide.
 */
export interface ProjectParticipant {
  id: string;
  name: string;
  source: "member" | "user";
  /** Roster standing for members ("Intern", "Team member"), staff tier for users. */
  role: string;
  /** True for members enrolled at another school. Always false for staff accounts. */
  isExternal: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  /** Participant id of the person accountable for the project. */
  ownerId: string | null;
  /** Denormalised owner name, so lists render without resolving every participant. */
  owner: string;
  startDate: string | null;
  deadline: string | null;
  /** Participant ids assigned to the project as a whole. */
  memberIds: string[];
  /**
   * Participants trusted to hand work to other people on this project.
   *
   * Being on a project lets somebody do the work; it does not let them decide
   * who else does it. That second capability is granted per project rather than
   * per person, because a member can reasonably lead one project and simply
   * take part in another, and a global "can assign" flag could not express that.
   * The owner always has it and does not need to appear here.
   */
  coordinatorIds: string[];
  createdAt: string;
  updatedAt: string | null;
  archivedAt: string | null;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: ProjectPriority;
  /** Participant ids. A task with none is unassigned, which the board flags. */
  assigneeIds: string[];
  dueDate: string | null;
  estimatedHours: number | null;
  createdAt: string;
  /** Display name of whoever created it, as recorded at the time. */
  createdBy: string;
  /**
   * Participant id of the creator, or null for tasks that predate the field.
   *
   * `createdBy` is a name written into the record and cannot be compared to a
   * session; this can. It is what lets "a task of mine" mean the one I raised as
   * well as the one I was given.
   */
  createdById: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  /** Position within its board column. */
  order: number;
}

export type ProjectActivityKind =
  | "project-created"
  | "project-updated"
  | "project-archived"
  | "project-restored"
  | "task-created"
  | "task-updated"
  | "task-status-changed"
  | "task-assigned"
  | "task-archived"
  | "member-assigned"
  | "member-removed";

/**
 * One thing that happened on a project. Written by the service on every mutation,
 * never edited afterwards — the timeline is an append-only record, in the same
 * spirit as the existing audit log.
 */
export interface ProjectActivityEvent {
  id: string;
  projectId: string;
  taskId: string | null;
  kind: ProjectActivityKind;
  /**
   * English text, written when the event happened.
   *
   * Kept as the fallback for anything without a `messageKey`, and as what a
   * future export or backend log would carry. It is never the preferred thing to
   * render — see `messageKey`.
   */
  summary: string;
  /**
   * Translation key for the same sentence, with `messageParams` filling it in.
   *
   * An activity feed is written once and read for the rest of the year, possibly
   * in a language nobody had chosen when it was written. Recording *what
   * happened* rather than *how to say it* is the only way the feed can be read
   * in Portuguese and in English from the same record.
   */
  messageKey: string | null;
  /**
   * Values for the key. `status`, `fromStatus` and `toStatus` hold raw status
   * codes and are translated by the renderer; everything else is literal text
   * (a task title, a list of names) and is interpolated as-is.
   */
  messageParams: Record<string, string> | null;
  actorId: string | null;
  actorName: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ Derived */

/** Task counts for one project, computed from its tasks rather than stored. */
export interface ProjectProgress {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  /** Whole-number percentage of tasks completed. Zero when there are no tasks. */
  percent: number;
}

/** A project joined with everything the list and detail views need. */
export interface ProjectSummary extends Project {
  participants: ProjectParticipant[];
  progress: ProjectProgress;
  /** Hours booked against this project through the existing daily journal. */
  journalHours: number;
  journalEntries: number;
  lastActivityAt: string | null;
  isOverdue: boolean;
}

/** One task joined with its project and the people on it. */
export interface ProjectTaskSummary extends ProjectTask {
  projectName: string;
  assignees: ProjectParticipant[];
  isOverdue: boolean;
  /** Whole days until the due date; negative when overdue, null with no due date. */
  daysUntilDue: number | null;
  /**
   * How the deadline should read next to the task ("2 days overdue", "Due in 5
   * days"), or null when there is nothing worth saying — no due date, a date far
   * enough out to be uninteresting, or a task that is already done.
   */
  dueLabel: string | null;
}

/**
 * One board column. The column's *name* is not stored: it is the translation of
 * its status, so a board built before a language change still renders correctly.
 */
export interface ProjectBoardColumn {
  status: TaskStatus;
  tasks: ProjectTaskSummary[];
}

/** How much work one person is carrying across every project. */
export interface ProjectWorkloadRow {
  participant: ProjectParticipant;
  assigned: number;
  open: number;
  done: number;
  overdue: number;
  projects: number;
  /** Journal hours this person booked against any project. */
  hours: number;
}

/** The Project Management overview, assembled in one pass over the data. */
export interface ProjectOverview {
  activeProjects: number;
  plannedProjects: number;
  completedProjects: number;
  archivedProjects: number;
  openTasks: number;
  overdueTasks: ProjectTaskSummary[];
  dueSoonTasks: ProjectTaskSummary[];
  unassignedTasks: number;
  /* The column name is the translation of the status, not a stored string. */
  statusBreakdown: Array<{ status: TaskStatus; count: number }>;
  recentActivity: ProjectActivityEvent[];
  recentlyUpdated: ProjectSummary[];
  workload: ProjectWorkloadRow[];
}

/* ------------------------------------------------------------------ Filters */

export interface ProjectFilters {
  query: string;
  status: ProjectStatus | "all";
  priority: ProjectPriority | "all";
  participantId: string | "all";
  /** Archived projects are hidden unless explicitly asked for. */
  includeArchived: boolean;
}

/** `due` narrows by deadline: overdue, due within seven days, or no date at all. */
/**
 * Assignee filter sentinel for work nobody owns.
 *
 * Unowned work is the most likely to slip, so it has to be selectable rather
 * than something you find by scanning. It rides the existing `assigneeId`
 * filter so both the Tasks table and the Team page reach it the same way.
 */
export const UNASSIGNED_ASSIGNEE = "__unassigned__";

export interface TaskFilters {
  query: string;
  projectId: string | "all";
  status: TaskStatus | "all";
  priority: ProjectPriority | "all";
  assigneeId: string | "all";
  due: "all" | "overdue" | "soon" | "none";
  includeArchived: boolean;
}

/* -------------------------------------------------------------- Form values */

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  ownerId: string | null;
  startDate: string | null;
  deadline: string | null;
  memberIds: string[];
  coordinatorIds: string[];
}

export interface TaskFormValues {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: ProjectPriority;
  assigneeIds: string[];
  dueDate: string | null;
  estimatedHours: number | null;
}

/**
 * Tone mapping, so status colours are decided once rather than re-derived on every
 * page. `BadgeTone` is the union `BaseBadge` accepts; the dashboard's narrower
 * `StatusTone` stays where it is because it has no neutral case.
 */
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export const PROJECT_STATUS_TONES: Record<ProjectStatus, BadgeTone> = {
  planned: "info",
  active: "success",
  paused: "warning",
  done: "neutral",
  archived: "neutral",
};

export const TASK_STATUS_TONES: Record<TaskStatus, BadgeTone> = {
  todo: "neutral",
  "in-progress": "info",
  blocked: "danger",
  review: "warning",
  done: "success",
};

export const PROJECT_PRIORITY_TONES: Record<ProjectPriority, BadgeTone> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  critical: "danger",
};
