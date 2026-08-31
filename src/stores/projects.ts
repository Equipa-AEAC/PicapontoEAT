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
import {
  archiveProject,
  archiveTask,
  assignTask,
  getProject,
  getProjectBoard,
  getProjectOverview,
  getProjectWorkload,
  listProjectActivity,
  listProjectParticipants,
  listProjects,
  listTasks,
  listTasksForParticipant,
  restoreProject,
  saveProject,
  saveTask,
  updateTaskStatus,
  type ProjectActor,
} from "../services/projects.service";
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
   * The signed-in member's own assigned work, for the student workspace.
   *
   * Separate from `myTasks` because the two resolve identity differently: an
   * administrator is a *user account*, a student is a *member*, and only the
   * member id appears on a task's assignee list.
   */
  const memberTasks = ref<ProjectTaskSummary[]>([]);
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
    { label: "Everyone", value: "all" },
    ...participants.value.map((participant) => ({ label: participant.name, value: participant.id })),
  ]);

  const projectOptions = computed(() => [
    { label: "All projects", value: "all" },
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
    await withErrorHandling("Unable to load the team.", async () => {
      participants.value = await listProjectParticipants();
    });
  }

  async function loadProjects() {
    loading.value = true;

    await withErrorHandling("Unable to load projects.", async () => {
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

    await withErrorHandling("Unable to load the project overview.", async () => {
      const [loadedOverview, loadedParticipants] = await Promise.all([getProjectOverview(), listProjectParticipants()]);
      overview.value = loadedOverview;
      participants.value = loadedParticipants;
    });

    loading.value = false;
  }

  /** Loads one project plus its board and timeline — everything the detail page shows. */
  async function loadProject(projectId: string) {
    loadingDetails.value = true;

    await withErrorHandling("Unable to load the project.", async () => {
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

    await withErrorHandling("Unable to load tasks.", async () => {
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

    await withErrorHandling("Unable to load your tasks.", async () => {
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
    await withErrorHandling("Unable to load this member's project work.", async () => {
      participantProjects.value = await listProjects({ participantId });
    });

    await focusOnParticipant(participantId);
  }

  async function loadProjectJournal(projectId: string) {
    await withErrorHandling("Unable to load the journal entries for this project.", async () => {
      projectJournal.value = await listAllDailyLogs({ projectId });
    });
  }

  /** Work assigned to one member. The only projects query a student may run. */
  async function loadMemberTasks(memberId: string) {
    loading.value = true;

    try {
      await withErrorHandling("Unable to load your assigned work.", async () => {
        memberTasks.value = await listTasksForParticipant(memberId);
      });
    } finally {
      loading.value = false;
    }
  }

  /**
   * A member moving their own task along.
   *
   * Deliberately not `moveTask`: that refreshes the admin board slices, which a
   * student never loads. This refreshes only their own list.
   */
  async function moveMemberTask(taskId: string, status: TaskStatus, memberId: string) {
    await withErrorHandling("Unable to update the task.", async () => {
      await updateTaskStatus(taskId, status, actor.value);
      memberTasks.value = await listTasksForParticipant(memberId);
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
      await withErrorHandling("Unable to load that person's work.", async () => {
        focusTasks.value = await listTasksForParticipant(participantId);
      });
    } finally {
      loadingDetails.value = false;
    }
  }

  /** Open work nobody owns — the queue most likely to slip unnoticed. */
  async function loadUnassignedTasks() {
    await withErrorHandling("Unable to load unassigned work.", async () => {
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

    await withErrorHandling("Unable to load the team workload.", async () => {
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

    await withErrorHandling("Unable to load project activity.", async () => {
      activity.value = await listProjectActivity(undefined, limit);
    });

    loading.value = false;
  }

  /* ------------------------------------------------------------- Mutations */

  async function persistProject(values: ProjectFormValues, projectId?: string) {
    saving.value = true;

    const saved = await withErrorHandling("Unable to save the project.", async () => {
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
    await withErrorHandling("Unable to archive the project.", async () => {
      await archiveProject(projectId, actor.value);
      await loadProjects();

      if (selectedProject.value?.id === projectId) {
        await loadProject(projectId);
      }
    });
  }

  async function restore(projectId: string) {
    await withErrorHandling("Unable to restore the project.", async () => {
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

    const saved = await withErrorHandling("Unable to save the task.", async () => {
      const task = await saveTask(values, actor.value, taskId);
      await refreshAfterTaskChange(task.projectId);
      return task;
    });

    saving.value = false;
    return saved;
  }

  async function moveTask(taskId: string, status: TaskStatus, projectId: string) {
    await withErrorHandling("Unable to move the task.", async () => {
      await updateTaskStatus(taskId, status, actor.value);
      await refreshAfterTaskChange(projectId);
    });
  }

  async function setTaskAssignees(taskId: string, assigneeIds: string[], projectId: string) {
    await withErrorHandling("Unable to change the assignees.", async () => {
      await assignTask(taskId, assigneeIds, actor.value);
      await refreshAfterTaskChange(projectId);
    });
  }

  async function removeTask(taskId: string, projectId: string) {
    await withErrorHandling("Unable to archive the task.", async () => {
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
    memberTasks,
    participantProjects,
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
    loadMemberTasks,
    moveMemberTask,
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
