import type { AuditFilters, AuditLogEntry } from "../types/audit";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function listAuditLogs(filters: Partial<AuditFilters> = {}): Promise<AuditLogEntry[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    return cloneRecord(
      mockDatabase.auditLogs.filter((entry) => {
        const matchesQuery =
          query.length === 0 || [entry.userName, entry.action, entry.entity, entry.description, entry.deviceName].join(" ").toLowerCase().includes(query);
        const matchesEntity = !filters.entity || filters.entity === "all" || entry.entity === filters.entity;
        const matchesAction = !filters.action || filters.action === "all" || entry.action === filters.action;
        const matchesUser = !filters.userName || filters.userName === "all" || entry.userName === filters.userName;

        return matchesQuery && matchesEntity && matchesAction && matchesUser;
      }),
    );
  });
}
