import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type {
  ProjectActivityEvent,
  ProjectBoardColumn,
  ProjectFilters,
  ProjectFormValues,
  ProjectOverview,
  ProjectParticipant,
  ProjectSummary,
  ProjectTaskSummary,
  ProjectWorkloadRow,
  TaskFilters,
  TaskFormValues,
  TaskStatus,
} from "../types/projects";
import { UNASSIGNED_ASSIGNEE } from "../types/projects";
import type { MemberProjectRights } from "../types/projectPermissions";
import {
  NO_PROJECT_RIGHTS,
  memberCanEditTask,
  memberCanRemoveTask,
} from "../types/projectPermissions";
import {
  archiveMemberTask,
  archiveProject,
  archiveTask,
  assignTask,
  getMemberProjectDetail,
  getMemberProjectWorkspace,
  getProject,
  getProjectBoard,
  getProjectOverview,
  getProjectWorkload,
  listProjectActivity,
  listProjectParticipants,
  listProjects,
  listTasks,
  listTasksForParticipant,
  moveMemberTaskStatus,
  restoreProject,
  saveMemberTask,
  saveProject,
  saveTask,
  updateTaskStatus,
  type ProjectActor,
} from "../services/projects.service";
import { t } from "../i18n";
import { useAuthStore } from "../modules/authentication/stores/auth";
import { listAllDailyLogs } from "../services/internshipReports.service";
import type { TeamJournalEntry } from "../types/internshipReports";

const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  query: "",
  status: "all",
  priority: "all",
  participantId: "all",
  includeArchived: false,
};

const EMPTY_TASK_FILTERS: TaskFilters = {
  query: "",
  projectId: "all",
  status: "all",
  priority: "all",
  assigneeId: "all",
  due: "all",
  includeArchived: false,
};

/**
 * Project management state.
 *
 * One store covers the whole workspace rather than one per page: the overview, the
 * project list, a single project's board and the task list all read the same records,
 * and splitting them would mean four caches that can disagree about the same task.
 *
 * Every mutation reloads the slices it can invalidate, because progress, workload and
 * the overdue counts are all derived server-side from tasks.
 */
export const useProjectsStore = defineStore("projects", () => {
  const authStore = useAuthStore();

  const items = ref<ProjectSummary[]>([]);
  /** Unfiltered list backing the filter dropdowns, so options never disappear. */
  const allProjects = ref<ProjectSummary[]>([]);
  const selectedProject = ref<ProjectSummary | null>(null);
  const board = ref<ProjectBoardColumn[]>([]);
  const tasks = ref<ProjectTaskSummary[]>([]);
  const myTasks = ref<ProjectTaskSummary[]>([]);
  const participants = ref<ProjectParticipant[]>([]);
  const activity = ref<ProjectActivityEvent[]>([]);
  const workload = ref<ProjectWorkloadRow[]>([]);
  /**
   * The person the Team page is currently inspecting, and their open work.
   * Kept here rather than in the page so a reassignment can refresh both the
   * focused list and the workload totals from one place.
   */
  const focusParticipantId = ref<string | null>(null);
  const focusTasks = ref<ProjectTaskSummary[]>([]);
  const unassignedTasks = ref<ProjectTaskSummary[]>([]);
  /**
   * The signed-in member's own project workspace: the projects they are on and
   * every task assigned to them, completed ones included.
   *
   * The completed tasks matter: a project view that hides finished work cannot
   * show what has been done.
   */
  const memberProjects = ref<ProjectSummary[]>([]);
  const memberProjectTasks = ref<ProjectTaskSummary[]>([]);
  /**
   * The one project a student currently has open, and its board.
   *
   * Held apart from `selectedProject` / `board`, which the admin workspace owns
   * and refreshes on its own schedule. A student never loads those slices, and
   * sharing them would mean one workspace's reload clearing the other's screen.
   */
  const memberProject = ref<ProjectSummary | null>(null);
  const memberBoard = ref<ProjectBoardColumn[]>([]);
  const memberParticipants = ref<ProjectParticipant[]>([]);
  const memberActivity = ref<ProjectActivityEvent[]>([]);
  /**
   * What the signed-in member may do, per project.
   *
   * Held as a map rather than a single value because My tasks lists work from
   * several projects at once and the answer differs between them — a member can
   * lead one project and simply take part in another. `memberRights` covers the
   * workspace lists; `openProjectRights` is the project currently on screen.
   *
   * These decide what the interface *offers*. They are computed in the browser
   * from data the client already holds, so they are not a security boundary —
   * the service re-checks every write, and the API must too.
   */
  const memberRights = ref<Record<string, MemberProjectRights>>({});
  const openProjectRights = ref<MemberProjectRights>(NO_PROJECT_RIGHTS);
  /** Projects one person is on. Backs the member record's project cross-link. */
  const participantProjects = ref<ProjectSummary[]>([]);
  /**
   * The journal entries written against the open project.
   *
   * The detail page already showed "11.7h from 3 entries" — a number with no way
   * to see what was behind it, short of going to Reports and rebuilding the
   * filter by hand. This is the same query that page runs, scoped to one project.
   */
  const projectJournal = ref<TeamJournalEntry[]>([]);
  const overview = ref<ProjectOverview | null>(null);

  const projectFilters = ref<ProjectFilters>({ ...EMPTY_PROJECT_FILTERS });
  const taskFilters = ref<TaskFilters>({ ...EMPTY_TASK_FILTERS });

  const loading = ref(false);
  const loadingDetails = ref(false);
  const saving = ref(false);
  const errorMessage = ref<string | null>(null);

  /**
   * Who the activity trail records. The signed-in account is a staff user, so its id
   * is already in the participant id space projects use.
   */
  const actor = computed<ProjectActor>(() => ({
    id: authStore.currentUser?.id ?? null,
    name: authStore.currentUser?.fullName ?? "System",
  }));

  const hasProjectFilters = computed(
    () =>
      projectFilters.value.query.trim().length > 0 ||
      projectFilters.value.status !== "all" ||
      projectFilters.value.priority !== "all" ||
      projectFilters.value.participantId !== "all" ||
      projectFilters.value.includeArchived,
  );

  const hasTaskFilters = computed(
    () =>
      taskFilters.value.query.trim().length > 0 ||
      taskFilters.value.projectId !== "all" ||
      taskFilters.value.status !== "all" ||
      taskFilters.value.priority !== "all" ||
      taskFilters.value.assigneeId !== "all" ||
      taskFilters.value.due !== "all",
  );

  const participantOptions = computed(() => [
    { label: t("projects.filters.everyone"), value: "all" },
    ...participants.value.map((participant) => ({ label: participant.name, value: participant.id })),
  ]);

  const projectOptions = computed(() => [
    { label: t("projects.filters.allProjects"), value: "all" },
    ...allProjects.value.map((project) => ({ label: project.name, value: project.id })),
  ]);

  function participantName(participantId: string): string {
    return participants.value.find((participant) => participant.id === participantId)?.name ?? participantId;
  }

  async function withErrorHandling<T>(fallbackMessage: string, work: () => Promise<T>): Promise<T | null> {
    errorMessage.value = null;

    try {
      return await work();
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : fallbackMessage;
      return null;
    }
  }

  async function loadParticipants() {
    await withErrorHandling(t("projects.errors.loadTeam"), async () => {
      participants.value = await listProjectParticipants();
    });
  }

  async function loadProjects() {
    loading.value = true;

    await withErrorHandling(t("projects.errors.loadProjects"), async () => {
      const [filtered, all] = await Promise.all([
        listProjects(projectFilters.value),
        listProjects({ includeArchived: true }),
      ]);
      items.value = filtered;
      allProjects.value = all;
    });

    loading.value = false;
  }

  async function loadOverview() {
    loading.value = true;

    await withErrorHandling(t("projects.errors.loadOverview"), async () => {
      const [loadedOverview, loadedParticipants] = await Promise.all([getProjectOverview(), listProjectParticipants()]);
      overview.value = loadedOverview;
      participants.value = loadedParticipants;
    });

    loading.value = false;
  }

  /** Loads one project plus its board and timeline — everything the detail page shows. */
  async function loadProject(projectId: string) {
    loadingDetails.value = true;

    await withErrorHandling(t("projects.errors.loadProject"), async () => {
      const [project, loadedBoard, loadedActivity, loadedParticipants] = await Promise.all([
        getProject(projectId),
        getProjectBoard(projectId),
        listProjectActivity(projectId),
        listProjectParticipants(),
      ]);
      selectedProject.value = project;
      board.value = loadedBoard;
      activity.value = loadedActivity;
      participants.value = loadedParticipants;
    });

    loadingDetails.value = false;
  }

  async function loadTasks() {
    loading.value = true;

    await withErrorHandling(t("projects.errors.loadTasks"), async () => {
      const [loadedTasks, all, loadedParticipants] = await Promise.all([
        listTasks(taskFilters.value),
        listProjects({ includeArchived: true }),
        listProjectParticipants(),
      ]);
      tasks.value = loadedTasks;
      allProjects.value = all;
      participants.value = loadedParticipants;
    });

    loading.value = false;
  }

  async function loadMyTasks() {
    const participantId = authStore.currentUser?.id;

    if (!participantId) {
      myTasks.value = [];
      return;
    }

    await withErrorHandling(t("projects.errors.loadMyTasks"), async () => {
      myTasks.value = await listTasksForParticipant(participantId);
    });
  }

  /**
   * Everything one person is working on: their projects and their open tasks.
   *
   * Both halves already existed as separate queries — this pairs them so the
   * member record can answer "what is this person actually doing" without the
   * reader having to go to the project workspace and filter by hand.
   */
  async function loadParticipantWork(participantId: string) {
    await withErrorHandling(t("projects.errors.loadMemberWork"), async () => {
      participantProjects.value = await listProjects({ participantId });
    });

    await focusOnParticipant(participantId);
  }

  async function loadProjectJournal(projectId: string) {
    await withErrorHandling(t("projects.errors.loadJournal"), async () => {
      projectJournal.value = await listAllDailyLogs({ projectId });
    });
  }

  /** The projects one member is on, plus all of their tasks. Student-side only. */
  async function loadMemberWorkspace(memberId: string) {
    loading.value = true;

    try {
      await withErrorHandling(t("projects.errors.loadMyProjects"), async () => {
        const workspace = await getMemberProjectWorkspace(memberId);
        memberProjects.value = workspace.projects;
        memberProjectTasks.value = workspace.tasks;
        memberRights.value = workspace.rights;
      });
    } finally {
      loading.value = false;
    }
  }

  /* ------------------------------------------------- Member capabilities */

  /**
   * What the member may do on one project.
   *
   * Reads the map the workspace query filled in, and falls back to the open
   * project when the caller is on the board rather than in a list. Returns "no
   * rights" for anything unknown, which is the safe direction: a control that
   * fails to appear is a nuisance, one that appears and is then refused is a
   * bug the member gets blamed for.
   */
  function rightsFor(projectId: string): MemberProjectRights {
    if (memberProject.value?.id === projectId && openProjectRights.value.canOpen) {
      return openProjectRights.value;
    }

    return memberRights.value[projectId] ?? NO_PROJECT_RIGHTS;
  }

  function memberCanEdit(memberId: string, task: ProjectTaskSummary): boolean {
    return memberCanEditTask(rightsFor(task.projectId), memberId, task);
  }

  function memberCanRemove(memberId: string, task: ProjectTaskSummary): boolean {
    return memberCanRemoveTask(rightsFor(task.projectId), memberId, task);
  }

  function memberCanAssignOthers(projectId: string): boolean {
    return rightsFor(projectId).canAssignOthers;
  }

  /**
   * Who the trail records for a student's own change.
   *
   * `actor` above is the signed-in *account*, which for a student is their user
   * record. The member id is what a task's assignee list holds, so the two are
   * passed separately: the member id decides what may be touched, the actor
   * decides whose name appears on the activity entry.
   */
  const memberActor = computed<ProjectActor>(() => ({
    id: authStore.currentMemberId ?? authStore.currentUser?.id ?? null,
    name: authStore.currentUser?.fullName ?? "Member",
  }));

  /** One project a student is on: record, board, people and timeline. */
  async function loadMemberProject(memberId: string, projectId: string) {
    loadingDetails.value = true;
    errorMessage.value = null;

    try {
      const detail = await getMemberProjectDetail(memberId, projectId);
      memberProject.value = detail.project;
      memberBoard.value = detail.board;
      memberParticipants.value = detail.participants;
      memberActivity.value = detail.activity;
      openProjectRights.value = detail.rights;
      return true;
    } catch (error) {
      // A refusal is a real answer here, so it replaces the board rather than
      // leaving the previous project's cards on screen under a new title.
      memberProject.value = null;
      memberBoard.value = [];
      memberParticipants.value = [];
      memberActivity.value = [];
      openProjectRights.value = NO_PROJECT_RIGHTS;
      errorMessage.value = error instanceof Error ? error.message : t("projects.errors.notOnProject");
      return false;
    } finally {
      loadingDetails.value = false;
    }
  }

  /** Everything a student's board view shows, re-read after any change to it. */
  async function refreshMemberProject(memberId: string, projectId: string) {
    await Promise.all([loadMemberProject(memberId, projectId), loadMemberWorkspace(memberId)]);
  }

  /** A student creating or editing a task on a project they are on. */
  async function persistMemberTask(
    memberId: string,
    values: TaskFormValues,
    taskId?: string,
  ) {
    saving.value = true;

    const saved = await withErrorHandling(t("projects.errors.saveTask"), async () => {
      const task = await saveMemberTask(memberId, values, memberActor.value, taskId);
      await refreshMemberProject(memberId, values.projectId);
      return task;
    });

    saving.value = false;
    return saved;
  }

  /** A student dragging a card between columns. */
  async function moveMemberBoardTask(memberId: string, taskId: string, status: TaskStatus) {
    return withErrorHandling(t("projects.errors.moveTask"), async () => {
      const task = await moveMemberTaskStatus(memberId, taskId, status, memberActor.value);

      if (task) {
        await refreshMemberProject(memberId, task.projectId);
      }

      return task;
    });
  }

  /** A student removing a task. Archived, not deleted — staff can restore it. */
  async function removeMemberTask(memberId: string, taskId: string, projectId: string) {
    saving.value = true;

    const removed = await withErrorHandling(t("projects.errors.removeTask"), async () => {
      await archiveMemberTask(memberId, taskId, memberActor.value);
      await refreshMemberProject(memberId, projectId);
      return true;
    });

    saving.value = false;
    return removed ?? false;
  }

  /**
   * A member changing the status of a task from My tasks.
   *
   * Goes through `moveMemberTaskStatus` — the member-scoped entry point — rather
   * than calling `updateTaskStatus` directly. The direct call was a real hole:
   * it skipped the project-membership check entirely and recorded the change
   * under the staff `actor` rather than the member, so a task id was all it took
   * to move a card on a board the member had never been on.
   */
  async function moveMemberProjectTask(taskId: string, status: TaskStatus, memberId: string) {
    await withErrorHandling(t("projects.errors.taskNotYours"), async () => {
      await moveMemberTaskStatus(memberId, taskId, status, memberActor.value);
      const workspace = await getMemberProjectWorkspace(memberId);
      memberProjects.value = workspace.projects;
      memberProjectTasks.value = workspace.tasks;
      memberRights.value = workspace.rights;
    });
  }

  /** Open the work one person is carrying. Passing null closes the panel. */
  async function focusOnParticipant(participantId: string | null) {
    focusParticipantId.value = participantId;

    if (!participantId) {
      focusTasks.value = [];
      return;
    }

    loadingDetails.value = true;

    try {
      await withErrorHandling(t("projects.errors.loadPersonWork"), async () => {
        focusTasks.value = await listTasksForParticipant(participantId);
      });
    } finally {
      loadingDetails.value = false;
    }
  }

  /** Open work nobody owns — the queue most likely to slip unnoticed. */
  async function loadUnassignedTasks() {
    await withErrorHandling(t("projects.errors.loadUnassigned"), async () => {
      unassignedTasks.value = (await listTasks({ assigneeId: UNASSIGNED_ASSIGNEE })).filter(
        (task) => task.status !== "done",
      );
    });
  }

  /** After any assignment change, everything the Team page shows has moved. */
  async function refreshTeamViews() {
    await Promise.all([
      loadWorkload(),
      loadUnassignedTasks(),
      focusParticipantId.value ? focusOnParticipant(focusParticipantId.value) : Promise.resolve(),
    ]);
  }

  async function loadWorkload() {
    loading.value = true;

    await withErrorHandling(t("projects.errors.loadWorkload"), async () => {
      const [loadedWorkload, loadedParticipants, all] = await Promise.all([
        getProjectWorkload(),
        listProjectParticipants(),
        listProjects({ includeArchived: true }),
      ]);
      workload.value = loadedWorkload;
      participants.value = loadedParticipants;
      allProjects.value = all;
    });

    loading.value = false;
  }

  /** Workspace-wide activity feed, not scoped to one project. */
  async function loadActivity(limit?: number) {
    loading.value = true;

    await withErrorHandling(t("projects.errors.loadActivity"), async () => {
      activity.value = await listProjectActivity(undefined, limit);
    });

    loading.value = false;
  }

  /* ------------------------------------------------------------- Mutations */

  async function persistProject(values: ProjectFormValues, projectId?: string) {
    saving.value = true;

    const saved = await withErrorHandling(t("projects.errors.saveProject"), async () => {
      const project = await saveProject(values, actor.value, projectId);
      await loadProjects();

      if (selectedProject.value?.id === project.id) {
        await loadProject(project.id);
      }

      return project;
    });

    saving.value = false;
    return saved;
  }

  async function archive(projectId: string) {
    await withErrorHandling(t("projects.errors.archiveProject"), async () => {
      await archiveProject(projectId, actor.value);
      await loadProjects();

      if (selectedProject.value?.id === projectId) {
        await loadProject(projectId);
      }
    });
  }

  async function restore(projectId: string) {
    await withErrorHandling(t("projects.errors.restoreProject"), async () => {
      await restoreProject(projectId, actor.value);
      await loadProjects();

      if (selectedProject.value?.id === projectId) {
        await loadProject(projectId);
      }
    });
  }

  /** Refreshes whichever views are currently populated after a task changes. */
  async function refreshAfterTaskChange(projectId: string) {
    const work: Array<Promise<unknown>> = [];

    if (selectedProject.value?.id === projectId) {
      work.push(loadProject(projectId));
    }

    if (tasks.value.length > 0) {
      work.push(loadTasks());
    }

    if (overview.value) {
      work.push(loadOverview());
    }

    if (workload.value.length > 0) {
      work.push(loadWorkload());
    }

    work.push(loadMyTasks());

    await Promise.all(work);
  }

  async function persistTask(values: TaskFormValues, taskId?: string) {
    saving.value = true;

    const saved = await withErrorHandling(t("projects.errors.saveTask"), async () => {
      const task = await saveTask(values, actor.value, taskId);
      await refreshAfterTaskChange(task.projectId);
      return task;
    });

    saving.value = false;
    return saved;
  }

  async function moveTask(taskId: string, status: TaskStatus, projectId: string) {
    await withErrorHandling(t("projects.errors.moveTask"), async () => {
      await updateTaskStatus(taskId, status, actor.value);
      await refreshAfterTaskChange(projectId);
    });
  }

  async function setTaskAssignees(taskId: string, assigneeIds: string[], projectId: string) {
    await withErrorHandling(t("projects.errors.assign"), async () => {
      await assignTask(taskId, assigneeIds, actor.value);
      await refreshAfterTaskChange(projectId);
    });
  }

  async function removeTask(taskId: string, projectId: string) {
    await withErrorHandling(t("projects.errors.archiveTask"), async () => {
      await archiveTask(taskId, actor.value);
      await refreshAfterTaskChange(projectId);
    });
  }

  function resetProjectFilters() {
    projectFilters.value = { ...EMPTY_PROJECT_FILTERS };
  }

  function resetTaskFilters() {
    taskFilters.value = { ...EMPTY_TASK_FILTERS };
  }

  return {
    items,
    allProjects,
    selectedProject,
    board,
    tasks,
    myTasks,
    participants,
    activity,
    workload,
    focusParticipantId,
    focusTasks,
    unassignedTasks,
    participantProjects,
    memberProjects,
    memberProjectTasks,
    memberProject,
    memberBoard,
    memberParticipants,
    memberActivity,
    memberRights,
    openProjectRights,
    rightsFor,
    memberCanEdit,
    memberCanRemove,
    memberCanAssignOthers,
    loadMemberWorkspace,
    loadMemberProject,
    refreshMemberProject,
    persistMemberTask,
    moveMemberBoardTask,
    removeMemberTask,
    moveMemberProjectTask,
    projectJournal,
    overview,
    projectFilters,
    taskFilters,
    loading,
    loadingDetails,
    saving,
    errorMessage,
    hasProjectFilters,
    hasTaskFilters,
    participantOptions,
    projectOptions,
    participantName,
    loadParticipants,
    loadProjects,
    loadOverview,
    loadProject,
    loadTasks,
    loadMyTasks,
    loadWorkload,
    focusOnParticipant,
    loadParticipantWork,
    loadProjectJournal,
    loadUnassignedTasks,
    refreshTeamViews,
    loadActivity,
    persistProject,
    archive,
    restore,
    persistTask,
    moveTask,
    setTaskAssignees,
    removeTask,
    resetProjectFilters,
    resetTaskFilters,
  };
});
