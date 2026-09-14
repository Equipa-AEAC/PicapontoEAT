export default {
  status: {
    planned: "Planned",
    active: "Active",
    paused: "Paused",
    done: "Completed",
    archived: "Archived",
  },

  priority: {
    low: "Low",
    normal: "Normal",
    high: "High",
    critical: "Critical",
  },

  taskStatus: {
    todo: "To do",
    "in-progress": "In progress",
    blocked: "Blocked",
    review: "In review",
    done: "Done",
  },

  participantRole: {
    intern: "Intern",
    teamMember: "Team member",
    administrator: "Administrator",
    coordinator: "Coordinator",
    teacher: "Teacher",
    viewer: "Viewer",
  },

  /*
   * Timeline sentences. Written from a recorded event rather than stored as
   * text, so a feed written in July reads correctly in whichever language it is
   * opened in. `status`, `fromStatus` and `toStatus` arrive as status codes and
   * are translated before interpolation.
   */
  activity: {
    entryCount: "{shown} of {total} entries",
    projectCreated: "Created the project",
    projectUpdated: "Updated the project details",
    projectStatusChanged: "Status changed from {fromStatus} to {toStatus}",
    projectArchived: "Archived the project",
    projectRestored: "Restored the project from the archive",
    taskCreated: "Created “{title}”",
    taskUpdated: "Updated “{title}”",
    taskStatusChanged: "Moved “{title}” to {status}",
    taskAssigned: "Assigned “{title}” to {names}",
    taskUnassigned: "Took everybody off “{title}”",
    taskArchived: "Removed “{title}” from the board",
    memberAssigned: "Added {names} to the project",
    memberRemoved: "Removed {names} from the project",
    empty: "Nothing has happened here yet.",
  },

  board: {
    empty: "Nothing here.",
    addTo: "Add a task to {column}",
    hint: "Drag a card between columns, or open it to change its status. Everything you do here is visible to the coordination team straight away.",
    readOnlyHint: "Open a card to read it. Moving and editing are done by the people assigned to this project.",
  },

  task: {
    one: "task",
    many: "tasks",
    fallbackTitle: "Task",
    assignedTo: "Assigned to",
    nobodyAssigned: "Nobody assigned",
    noDescription: "No description was written for this task.",
    estimated: "Estimated",
    yours: "Yours",
    openBoard: "Open the {project} board",
    createdBy: "Created by {name}",
  },

  form: {
    newTitle: "New task",
    editTitle: "Edit task",
    create: "Create task",
    project: "Project",
    chooseProject: "Choose a project",
    title: "Title",
    titlePlaceholder: "Flash firmware onto the lab terminals",
    description: "Description",
    descriptionPlaceholder: "What has to be done, and how you know it is finished.",
    dueDate: "Due date",
    estimatedHours: "Estimated hours",
    responsible: "Responsible for this task",
    onlyProjectPeople: "Only people assigned to the project are listed.",
    errorTitle: "Give the task a title.",
    errorProject: "Choose the project this task belongs to.",
  },

  projectForm: {
    newTitle: "New project",
    editTitle: "Edit project",
    create: "Create project",
    subtitle: "Projects group the work the team is doing and the people doing it.",
    namePlaceholder: "RFID attendance terminals",
    descriptionPlaceholder: "What this project covers and what done looks like.",
    owner: "Responsible",
    people: "People on this project",
    coordinators: "Task coordinators",
    coordinatorsHint:
      "These people can assign work to anybody on the project, and edit or remove any task on it. Everybody else can create tasks, move cards and change their own work. The owner always has this.",
    errorName: "Give the project a name.",
    errorDeadline: "The deadline cannot fall before the start date.",
  },

  assignment: {
    /* Shown to a member who may only put work on their own list. */
    selfOnlyLabel: "Who is doing this",
    assignToMe: "Assign this task to me",
    assignedToYou: "This task is on your list.",
    notAssignedToYou: "This task is not on your list.",
    selfOnlyHint:
      "You can put this task on your own list. Assigning it to somebody else is done by the project owner or a task coordinator.",
    othersKept: "Also assigned: {names}",
    othersKeptHint: "Their assignment stays as it is.",
    coordinatorHint: "You can assign this to anybody on the project.",
  },

  remove: {
    title: "Remove this task?",
    message:
      "“{title}” will be taken off the board. It is archived rather than deleted, so the coordination team can still find it.",
    confirm: "Remove task",
  },

  participants: {
    legend: "Assigned people",
    selected: "{count} selected",
    filter: "Filter people",
    members: "Members",
    staff: "Staff",
    external: "External",
    noMatches: "Nobody matches that filter.",
  },

  progress: {
    barCounts: "{done} of {total} tasks",
    overdueCount: "{count} overdue",
    blockedCount: "{count} blocked",
    label: "Progress",
    doneOfTotal: "{done} of {total} tasks done",
    doneOfTotalTeam: "{done} of {total} tasks done across the team",
  },

  /* ------------------------------------------------------- Student pages */
  studentList: {
    title: "Projects",
    description: "The projects you are on. Open one to work on its board.",
    metricProjects: "Projects",
    metricProjectsCaption: "You are assigned to these",
    metricOpen: "Open tasks",
    metricOpenCaption: "Assigned to you, not yet done",
    metricLate: "Past deadline",
    metricLateCaption: "Tell your monitor if something is blocking you",
    metricDone: "Completed",
    metricDoneCaption: "Tasks you have finished",
    emptyTitle: "You are not on a project yet",
    emptyDescription:
      "When the coordination team puts you on one, it appears here with its board, its deadlines and your part of the work.",
    noDescription: "No description was written for this project.",
    yourShare: "{done}/{total} of your tasks done",
    dueOn: "due {date}",
    lateOne: "1 of your tasks is past its deadline",
    lateMany: "{count} of your tasks are past their deadline",
    openBoard: "Open the board",
  },

  studentTasks: {
    title: "My tasks",
    description: "Everything assigned to you, most urgent first. Open one to read it or change it.",
    metricOpen: "Open",
    metricOpenCaption: "Assigned to you, not yet done",
    metricLate: "Past deadline",
    metricLateCaption: "Tell your monitor if something is blocking you",
    metricNothingLate: "Nothing is late",
    metricSoon: "Due soon",
    metricSoonCaption: "Within the next week",
    metricDone: "Completed",
    metricDoneCaption: "Tasks you have finished",
    filterOpen: "Open tasks",
    filterEverything: "Everything",
    filterAllProjects: "All projects",
    countTitle: "{count} task | {count} tasks",
    countDescription: "Overdue first, then by deadline. The row shows what ranks it; the rest is inside.",
    emptyFilteredTitle: "Nothing matches these filters",
    emptyFilteredDescription: "Clear the filters to see the rest of your work.",
    emptyTitle: "Nothing assigned to you",
    emptyDescription:
      "When somebody puts you on a project task it shows up here, with its deadline and where it stands.",
  },

  studentDetail: {
    allProjects: "All projects",
    projectDetails: "Project details",
    newTask: "New task",
    loadingBoard: "Loading the board.",
    unavailableTitle: "Project unavailable",
    unavailableDescription:
      "This project is not one of yours, or it has been archived. Go back and pick one from your list.",
    assignedToYou: "{count} assigned to you",
    noDeadlineSet: "No deadline set",
    dueOn: "Due {date}",
    overdue: "overdue",
    tabBoard: "Board",
    tabList: "List",
    tabActivity: "Activity",
    listTitle: "Every task on this project",
    listDescription: "Ordered by deadline. Yours are marked.",
    listEmptyTitle: "No tasks yet",
    listEmptyDescription: "Add the first one and it appears on the board.",
    activityTitle: "What has happened",
    activityDescription: "Everything recorded against this project, newest first.",
    eventsTitle: "Coming up on this project",
    eventsDescription: "Shared events addressed to the people on this project.",
    seeOnCalendar: "See them on the calendar",
    noProjectDescription: "No description was written for this project.",
    owner: "Owner",
    starts: "Starts",
    team: "Team",
    taskCoordinators: "Task coordinators",
    taskCoordinatorsNone: "Nobody yet — only the owner can assign work to others.",
    yourWork: "Your work",
    yourWorkValue: "{done} of {total} done",
    maintainedNote:
      "The project itself — its description, dates and who is on it — is maintained by the coordination team.",
    yourRights: "What you can do here",
    rightsCoordinator: "You can create, edit and move any task, and assign work to anybody on this project.",
    rightsOwner: "You own this project: you can create, edit and move any task, and assign work to anybody on it.",
    rightsParticipant:
      "You can create tasks, move any card, and edit or remove the tasks that are yours. Assigning work to other people is done by the project owner or a task coordinator.",
    logTime: "Log time on this project",
  },

  filters: {
    everyone: "Everyone",
    allProjects: "All projects",
    allStatuses: "All statuses",
    allPriorities: "All priorities",
    unassigned: "Unassigned",
  },

  errors: {
    notOnProject: "You are not on that project.",
    taskNotYours: "That task is not on one of your projects.",
    cannotAssignOthers: "You cannot assign this task to other people.",
    cannotEditTask: "You can only change tasks that are yours.",
    cannotRemoveTask: "You can only remove tasks that are yours.",

    /* Load and save failures, worded as what could not be done. */
    loadTeam: "Could not load the team.",
    loadProjects: "Could not load the projects.",
    loadOverview: "Could not load the project overview.",
    loadProject: "Could not load the project.",
    loadTasks: "Could not load the tasks.",
    loadMyTasks: "Could not load your tasks.",
    loadMemberWork: "Could not load this member's project work.",
    loadJournal: "Could not load the journal entries for this project.",
    loadMyProjects: "Could not load your projects.",
    loadPersonWork: "Could not load that person's work.",
    loadUnassigned: "Could not load the unassigned work.",
    loadWorkload: "Could not load the team workload.",
    loadActivity: "Could not load the project activity.",
    saveTask: "Could not save the task.",
    moveTask: "Could not move the task.",
    removeTask: "Could not remove the task.",
    archiveTask: "Could not archive the task.",
    assign: "Could not change who is assigned.",
    saveProject: "Could not save the project.",
    archiveProject: "Could not archive the project.",
    restoreProject: "Could not restore the project.",
  },
} as const;
