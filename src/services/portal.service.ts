import type { StudentPortalSummary } from "../types/portal";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { computeParticipationHours } from "./participation.service";

/**
 * The student portal summary.
 *
 * Every hour figure here used to be stored on the fixture — a fourth copy of the
 * internship's hours, alongside the internship record, the member record and a
 * per-member map. A progress update wrote one of them, so the student dashboard
 * and the admin internship page could show different numbers for the same
 * placement.
 *
 * They are all derived now: `teamHours` and `internshipHours` come from the
 * member's participation periods, `remainingHours` from the internship's
 * requirement, and `internshipProgress` measures the **internship hours only** —
 * volunteer time never counts towards the FCT requirement.
 */
export async function getStudentPortalSummary(memberId: string): Promise<StudentPortalSummary> {
  return mockRequest(() => {
    const internship = mockDatabase.internships.find((item) => item.studentId === memberId) ?? null;
    const hours = computeParticipationHours(memberId);

    const requiredHours = internship?.requiredHours ?? 0;
    const completedHours = hours.internshipHours;
    const remainingHours = Math.max(requiredHours - completedHours, 0);

    return cloneRecord({
      ...mockDatabase.portal,
      currentInternshipStatus: internship ? internship.status : null,
      completedHours,
      remainingHours,
      internshipProgress: requiredHours > 0 ? Math.round((completedHours / requiredHours) * 100) : 0,
      teamHours: hours.teamHours,
      internshipHours: hours.internshipHours,
    } as StudentPortalSummary);
  });
}
