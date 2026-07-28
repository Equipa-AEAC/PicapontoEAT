import type { StudentPortalSummary } from "../types/portal";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function getStudentPortalSummary(): Promise<StudentPortalSummary> {
  return mockRequest(() => cloneRecord(mockDatabase.portal));
}
