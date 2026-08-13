import type {
  DailyLogEntry,
  DailyLogFormValues,
  FinalReport,
  FinalReportFormValues,
  InternshipJournalSummary,
  MemberJournalCoverage,
  MonthlyReport,
  MonthlyReportDraft,
  Project,
  ProjectActivitySummary,
  TeamJournalEntry,
  TeamJournalFilters,
  TeamJournalSummary,
} from "../types/internshipReports";

import { cloneRecord, mockRequest } from "./mockTransport";
import { lastDayOfMonth } from "../utils/date";
import { mockDatabase } from "./mockDatabase";

function monthOf(date: string): string {
  return date.slice(0, 7);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function wholeDaysSince(date: string): number | null {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
}

function sortByDateDescending(entries: DailyLogEntry[]): DailyLogEntry[] {
  return [...entries].sort((first, second) => second.date.localeCompare(first.date));
}

function entriesForStudent(studentId: string): DailyLogEntry[] {
  return mockDatabase.dailyLogs.filter((entry) => entry.studentId === studentId);
}

export async function listDailyLogs(studentId: string): Promise<DailyLogEntry[]> {
  return mockRequest(() => cloneRecord(sortByDateDescending(entriesForStudent(studentId))));
}

export async function listProjects(): Promise<Project[]> {
  return mockRequest(() => cloneRecord(mockDatabase.projects));
}

/**
 * Every daily entry across the whole roster, joined with the member who wrote it
 * and the project it belongs to. This is the admin-side view of the journal: the
 * per-student `listDailyLogs` above only ever sees one person.
 */
export async function listAllDailyLogs(filters: Partial<TeamJournalFilters> = {}): Promise<TeamJournalEntry[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    const joined: TeamJournalEntry[] = mockDatabase.dailyLogs.map((entry) => {
      const member = mockDatabase.members.find((item) => item.id === entry.studentId);
      const project = mockDatabase.projects.find((item) => item.id === entry.projectId);

      return {
        ...entry,
        memberName: member?.fullName ?? "Unknown member",
        memberIsExternal: member?.isExternal ?? false,
        projectName: project?.name ?? null,
      };
    });

    const filtered = joined.filter((entry) => {
      const matchesQuery =
        query.length === 0 ||
        [entry.memberName, entry.activities, entry.learnings, entry.difficulties, entry.projectName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesMember = !filters.memberId || filters.memberId === "all" || entry.studentId === filters.memberId;
      const matchesProject = !filters.projectId || filters.projectId === "all" || entry.projectId === filters.projectId;
      const matchesMonth = !filters.month || filters.month === "all" || entry.date.startsWith(filters.month);
      const matchesStatus = !filters.status || filters.status === "all" || entry.status === filters.status;

      return matchesQuery && matchesMember && matchesProject && matchesMonth && matchesStatus;
    });

    return cloneRecord(filtered.sort((first, second) => second.date.localeCompare(first.date)));
  });
}

/**
 * Cross-member rollups: who is still writing entries (coverage) and where the
 * hours went (projects). Writing a journal is optional but recommended, so this
 * exists to surface gaps rather than to enforce anything.
 */
export async function getTeamJournalSummary(): Promise<TeamJournalSummary> {
  return mockRequest(() => {
    const month = currentMonth();
    const entries = mockDatabase.dailyLogs;

    const coverage: MemberJournalCoverage[] = mockDatabase.members.map((member) => {
      const memberEntries = entries.filter((entry) => entry.studentId === member.id);
      const thisMonth = memberEntries.filter((entry) => entry.date.startsWith(month));
      const lastEntryDate = memberEntries.map((entry) => entry.date).sort((first, second) => second.localeCompare(first))[0] ?? null;

      return {
        memberId: member.id,
        memberName: member.fullName,
        isIntern: member.internshipStatus !== "not-assigned",
        entriesThisMonth: thisMonth.length,
        totalEntries: memberEntries.length,
        hoursThisMonth: Number(thisMonth.reduce((total, entry) => total + entry.hours, 0).toFixed(1)),
        totalHours: Number(memberEntries.reduce((total, entry) => total + entry.hours, 0).toFixed(1)),
        lastEntryDate,
        daysSinceLastEntry: lastEntryDate ? wholeDaysSince(lastEntryDate) : null,
      };
    });

    const projects: ProjectActivitySummary[] = mockDatabase.projects.map((project) => {
      const projectEntries = entries.filter((entry) => entry.projectId === project.id);
      const contributorIds = [...new Set(projectEntries.map((entry) => entry.studentId))];

      return {
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        owner: project.owner,
        hours: Number(projectEntries.reduce((total, entry) => total + entry.hours, 0).toFixed(1)),
        entries: projectEntries.length,
        contributors: contributorIds.map(
          (id) => mockDatabase.members.find((member) => member.id === id)?.fullName ?? "Unknown member",
        ),
        lastActivityDate: projectEntries.map((entry) => entry.date).sort((first, second) => second.localeCompare(first))[0] ?? null,
      };
    });

    return {
      totalEntries: entries.length,
      totalHours: Number(entries.reduce((total, entry) => total + entry.hours, 0).toFixed(1)),
      contributors: new Set(entries.map((entry) => entry.studentId)).size,
      entriesThisMonth: entries.filter((entry) => entry.date.startsWith(month)).length,
      coverage: cloneRecord(coverage),
      projects: cloneRecord(projects),
    };
  });
}

export async function createDailyLog(studentId: string, values: DailyLogFormValues): Promise<DailyLogEntry> {
  return mockRequest(() => {
    const duplicate = mockDatabase.dailyLogs.find((entry) => entry.studentId === studentId && entry.date === values.date);

    if (duplicate) {
      throw new Error("A daily entry already exists for that date.");
    }

    const created: DailyLogEntry = {
      id: `log-d-${mockDatabase.dailyLogs.length + 1}-${Date.now()}`,
      studentId,
      date: values.date,
      hours: values.hours,
      projectId: values.projectId,
      activities: values.activities,
      learnings: values.learnings,
      difficulties: values.difficulties,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    mockDatabase.dailyLogs.unshift(created);
    return cloneRecord(created);
  });
}

export async function updateDailyLog(entryId: string, values: DailyLogFormValues): Promise<DailyLogEntry> {
  return mockRequest(() => {
    const entry = mockDatabase.dailyLogs.find((item) => item.id === entryId);

    if (!entry) {
      throw new Error("Daily entry not found.");
    }

    if (entry.status === "submitted") {
      throw new Error("Submitted entries can no longer be edited.");
    }

    entry.date = values.date;
    entry.hours = values.hours;
    entry.projectId = values.projectId;
    entry.activities = values.activities;
    entry.learnings = values.learnings;
    entry.difficulties = values.difficulties;
    entry.updatedAt = new Date().toISOString();
    return cloneRecord(entry);
  });
}

export async function submitDailyLog(entryId: string): Promise<DailyLogEntry> {
  return mockRequest(() => {
    const entry = mockDatabase.dailyLogs.find((item) => item.id === entryId);

    if (!entry) {
      throw new Error("Daily entry not found.");
    }

    entry.status = "submitted";
    entry.updatedAt = new Date().toISOString();
    return cloneRecord(entry);
  });
}

export async function deleteDailyLog(entryId: string): Promise<void> {
  return mockRequest(() => {
    const index = mockDatabase.dailyLogs.findIndex((item) => item.id === entryId);

    if (index >= 0) {
      mockDatabase.dailyLogs.splice(index, 1);
    }
  });
}

export async function getJournalSummary(studentId: string): Promise<InternshipJournalSummary> {
  return mockRequest(() => {
    const entries = entriesForStudent(studentId);
    const sorted = sortByDateDescending(entries);

    return {
      totalEntries: entries.length,
      submittedEntries: entries.filter((entry) => entry.status === "submitted").length,
      totalHours: Number(entries.reduce((total, entry) => total + entry.hours, 0).toFixed(1)),
      lastEntryDate: sorted[0]?.date ?? null,
      monthsCovered: [...new Set(entries.map((entry) => monthOf(entry.date)))].sort((first, second) => second.localeCompare(first)),
    };
  });
}

export async function listMonthlyReports(studentId: string): Promise<MonthlyReport[]> {
  return mockRequest(() =>
    cloneRecord(
      mockDatabase.monthlyReports
        .filter((report) => report.studentId === studentId)
        .sort((first, second) => second.month.localeCompare(first.month)),
    ),
  );
}

/**
 * Builds the monthly balance from the daily entries of the requested month.
 * Mirrors the "balanço das atividades" section of the Ficha de Evolução Intermédia.
 */
export async function buildMonthlyReportDraft(studentId: string, month: string): Promise<MonthlyReportDraft> {
  return mockRequest(() => {
    const entries = entriesForStudent(studentId).filter((entry) => monthOf(entry.date) === month);
    const previous = mockDatabase.monthlyReports
      .filter((report) => report.studentId === studentId && report.month < month)
      .sort((first, second) => second.month.localeCompare(first.month))[0];

    const difficulties = entries
      .map((entry) => entry.difficulties.trim())
      .filter((value) => value.length > 0);

    return {
      month,
      periodStart: `${month}-01`,
      periodEnd: lastDayOfMonth(month),
      totalHours: Number(entries.reduce((total, entry) => total + entry.hours, 0).toFixed(1)),
      entriesCount: entries.length,
      activitiesCompleted: entries
        .sort((first, second) => first.date.localeCompare(second.date))
        .map((entry) => entry.activities.trim())
        .filter((value) => value.length > 0),
      activitiesPlanned: previous?.activitiesPlanned ?? [],
      mainDifficulties: difficulties.join(" "),
    };
  });
}

export async function saveMonthlyReport(studentId: string, draft: MonthlyReportDraft): Promise<MonthlyReport> {
  return mockRequest(() => {
    const existing = mockDatabase.monthlyReports.find((report) => report.studentId === studentId && report.month === draft.month);

    if (existing) {
      if (existing.status !== "draft") {
        throw new Error("This monthly report was already submitted.");
      }

      Object.assign(existing, draft, { generatedAt: new Date().toISOString() });
      return cloneRecord(existing);
    }

    const created: MonthlyReport = {
      id: `mr-${mockDatabase.monthlyReports.length + 1}-${Date.now()}`,
      studentId,
      ...draft,
      status: "draft",
      generatedAt: new Date().toISOString(),
      submittedAt: null,
    };

    mockDatabase.monthlyReports.unshift(created);
    return cloneRecord(created);
  });
}

export async function submitMonthlyReport(reportId: string): Promise<MonthlyReport> {
  return mockRequest(() => {
    const report = mockDatabase.monthlyReports.find((item) => item.id === reportId);

    if (!report) {
      throw new Error("Monthly report not found.");
    }

    report.status = "submitted";
    report.submittedAt = new Date().toISOString();
    return cloneRecord(report);
  });
}

export async function getFinalReport(studentId: string): Promise<FinalReport> {
  return mockRequest(() => {
    const existing = mockDatabase.finalReports[studentId];

    if (existing) {
      return cloneRecord(existing);
    }

    const created: FinalReport = {
      studentId,
      companyCharacterization: "",
      activitiesPerformed: "",
      difficulties: "",
      newLearnings: "",
      occurrences: "",
      other: "",
      status: "draft",
      updatedAt: null,
      submittedAt: null,
    };

    mockDatabase.finalReports[studentId] = created;
    return cloneRecord(created);
  });
}

export async function saveFinalReport(studentId: string, values: FinalReportFormValues): Promise<FinalReport> {
  return mockRequest(() => {
    const report = mockDatabase.finalReports[studentId];

    if (!report) {
      throw new Error("Final report not found.");
    }

    if (report.status === "submitted") {
      throw new Error("The final report was already submitted.");
    }

    Object.assign(report, values, { updatedAt: new Date().toISOString() });
    return cloneRecord(report);
  });
}

export async function submitFinalReport(studentId: string): Promise<FinalReport> {
  return mockRequest(() => {
    const report = mockDatabase.finalReports[studentId];

    if (!report) {
      throw new Error("Final report not found.");
    }

    report.status = "submitted";
    report.submittedAt = new Date().toISOString();
    return cloneRecord(report);
  });
}

/**
 * Pre-fills the final report from everything the student already wrote, so the
 * final document is a consolidation of the journal instead of a blank page.
 */
export async function buildFinalReportSuggestion(studentId: string, hostEntity: string): Promise<FinalReportFormValues> {
  return mockRequest(() => {
    const entries = sortByDateDescending(entriesForStudent(studentId)).reverse();
    const join = (values: string[]) => values.filter((value) => value.trim().length > 0).join("\n");

    return {
      companyCharacterization: hostEntity,
      activitiesPerformed: join(entries.map((entry) => `${entry.date} — ${entry.activities}`)),
      difficulties: join(entries.map((entry) => entry.difficulties)),
      newLearnings: join(entries.map((entry) => entry.learnings)),
      occurrences: "",
      other: "",
    };
  });
}
