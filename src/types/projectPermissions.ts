import type { Project, ProjectTask } from "./projects";

/**
 * What a member may do on a project board.
 *
 * This is the single statement of the rules. The service enforces them, the
 * store carries the result, and the pages ask it what to *render* — so a control
 * that appears and an action that is accepted can never come from two different
 * opinions about the same member.
 *
 * ## The rules
 *
 * Being on a project means being able to do the work on it. It does not mean
 * being able to decide who else does it, and it does not mean being able to
 * rewrite somebody else's task. Those are three separate things, and the reason
 * they were one thing before is that the first version only asked "is this
 * person on the project".
 *
 * | Capability                     | Participant | Task coordinator | Owner |
 * |--------------------------------|-------------|------------------|-------|
 * | Open the board                 | yes         | yes              | yes   |
 * | Move any card between columns  | yes         | yes              | yes   |
 * | Create a task                  | yes         | yes              | yes   |
 * | Assign a task to themselves    | yes         | yes              | yes   |
 * | Assign a task to somebody else | **no**      | yes              | yes   |
 * | Edit / remove *their own* task | yes         | yes              | yes   |
 * | Edit / remove anybody's task   | **no**      | yes              | yes   |
 *
 * **Moving is deliberately open to everybody on the project.** A board whose
 * cards only their owner may move is not a shared board, and a status change is
 * both reversible and recorded. Editing and removing are not equivalent: they
 * rewrite or withdraw work somebody else is depending on.
 *
 * "Their own task" means one assigned to them *or* one they created. A member
 * who raises a task and hands it to nobody must still be able to correct it.
 *
 * BACKEND CONTRACT: every function here runs in the browser on data the client
 * already holds. It decides what to *show*, and it keeps the client honest about
 * what it sends. It is not authorization — the API must take the member from the
 * session and apply this same table before accepting any write. See
 * docs/ai/BACKEND_CONTRACTS.md § Student project access.
 */

/** How one member is connected to one project. */
export type ProjectRelationship = "owner" | "coordinator" | "participant" | "assignee" | "none";

export interface MemberProjectRights {
  relationship: ProjectRelationship;
  /** On the project at all. Everything else is false when this is false. */
  canOpen: boolean;
  canCreateTask: boolean;
  /** Drag a card, or change a status from the task dialog. */
  canMoveTasks: boolean;
  /** Put work on somebody else's list. Owner and task coordinators only. */
  canAssignOthers: boolean;
  /** Edit or remove tasks that are not theirs. Owner and task coordinators only. */
  canManageEveryTask: boolean;
}

/** The subset of a project these rules read. Keeps the check usable on summaries. */
export interface ProjectAccessShape {
  ownerId: string | null;
  memberIds: string[];
  coordinatorIds: string[];
}

/** The subset of a task these rules read. */
export interface TaskOwnershipShape {
  assigneeIds: string[];
  createdById: string | null;
}

const NO_RIGHTS: MemberProjectRights = {
  relationship: "none",
  canOpen: false,
  canCreateTask: false,
  canMoveTasks: false,
  canAssignOthers: false,
  canManageEveryTask: false,
};

/**
 * `holdsTask` covers the member who is not on the participant list but was given
 * work on the project. Being handed a task is itself a relationship to the
 * project — otherwise their own task would sit on their list with no board
 * behind it — but it is the weakest one, and it grants nothing beyond a
 * participant's rights.
 */
export function memberProjectRights(
  memberId: string,
  project: ProjectAccessShape | null | undefined,
  holdsTask = false,
): MemberProjectRights {
  if (!memberId || !project) {
    return NO_RIGHTS;
  }

  const isOwner = project.ownerId === memberId;
  const isCoordinator = project.coordinatorIds?.includes(memberId) ?? false;
  const isParticipant = project.memberIds.includes(memberId);

  if (!isOwner && !isCoordinator && !isParticipant && !holdsTask) {
    return NO_RIGHTS;
  }

  const relationship: ProjectRelationship = isOwner
    ? "owner"
    : isCoordinator
      ? "coordinator"
      : isParticipant
        ? "participant"
        : "assignee";

  const leads = isOwner || isCoordinator;

  return {
    relationship,
    canOpen: true,
    canCreateTask: true,
    canMoveTasks: true,
    canAssignOthers: leads,
    canManageEveryTask: leads,
  };
}

/** A task is "theirs" if they are doing it or they raised it. */
export function memberOwnsTask(memberId: string, task: TaskOwnershipShape): boolean {
  return task.assigneeIds.includes(memberId) || task.createdById === memberId;
}

export function memberCanEditTask(
  rights: MemberProjectRights,
  memberId: string,
  task: TaskOwnershipShape,
): boolean {
  return rights.canOpen && (rights.canManageEveryTask || memberOwnsTask(memberId, task));
}

export function memberCanRemoveTask(
  rights: MemberProjectRights,
  memberId: string,
  task: TaskOwnershipShape,
): boolean {
  return memberCanEditTask(rights, memberId, task);
}

/**
 * The assignee list a member is allowed to submit.
 *
 * Without the right to assign others, the only thing a member may change is
 * whether *they* are on the task; everybody else's assignment is preserved
 * exactly as it was. This is the rule the form renders and the service checks,
 * so an edit cannot quietly take a colleague off a task the editor could not
 * have put them on.
 */
export function resolveAssigneeIds(options: {
  rights: MemberProjectRights;
  memberId: string;
  requested: string[];
  existing: string[];
}): string[] {
  const { rights, memberId, requested, existing } = options;

  if (rights.canAssignOthers) {
    return [...requested];
  }

  const others = existing.filter((id) => id !== memberId);
  const wantsSelf = requested.includes(memberId);

  return wantsSelf ? [...others, memberId] : others;
}

/** True when `requested` tries to change somebody else's assignment. */
export function assignmentTouchesOthers(memberId: string, requested: string[], existing: string[]): boolean {
  const before = existing.filter((id) => id !== memberId).sort().join(",");
  const after = requested.filter((id) => id !== memberId).sort().join(",");

  return before !== after;
}

/** The i18n key describing, in one sentence, what this member may do here. */
export function rightsSummaryKey(rights: MemberProjectRights): string {
  if (rights.relationship === "owner") return "projects.studentDetail.rightsOwner";
  if (rights.relationship === "coordinator") return "projects.studentDetail.rightsCoordinator";

  return "projects.studentDetail.rightsParticipant";
}

/** Convenience for a project a member may not touch at all. */
export const NO_PROJECT_RIGHTS = NO_RIGHTS;

/** Narrowing helper so callers can pass a full `Project` or a summary. */
export function toAccessShape(project: Pick<Project, "ownerId" | "memberIds" | "coordinatorIds">): ProjectAccessShape {
  return {
    ownerId: project.ownerId,
    memberIds: project.memberIds,
    coordinatorIds: project.coordinatorIds ?? [],
  };
}

/** Narrowing helper for tasks. */
export function toOwnershipShape(task: Pick<ProjectTask, "assigneeIds" | "createdById">): TaskOwnershipShape {
  return { assigneeIds: task.assigneeIds, createdById: task.createdById ?? null };
}
