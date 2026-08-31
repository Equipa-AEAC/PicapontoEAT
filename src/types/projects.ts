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

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  done: "Completed",
  archived: "Archived",
};

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  "in-progress": "In progress",
  blocked: "Blocked",
  review: "In review",
  done: "Done",
};

/** Board column order. Also the order statuses are listed in every select. */
export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "blocked", "review", "done"];

export const PROJECT_STATUS_OPTIONS = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((value) => ({
  label: PROJECT_STATUS_LABELS[value],
  value,
}));

export const PROJECT_PRIORITY_OPTIONS = (Object.keys(PROJECT_PRIORITY_LABELS) as ProjectPriority[]).map((value) => ({
  label: PROJECT_PRIORITY_LABELS[value],
  value,
}));

export const TASK_STATUS_OPTIONS = TASK_STATUS_ORDER.map((value) => ({
  label: TASK_STATUS_LABELS[value],
  value,
}));

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
  createdBy: string;
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
  summary: string;
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

export interface ProjectBoardColumn {
  status: TaskStatus;
  label: string;
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
  statusBreakdown: Array<{ status: TaskStatus; label: string; count: number }>;
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
