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

/**
 * Append an entry to the audit trail.
 *
 * The audit log used to be read-only from the service layer, which meant any
 * workflow with a reviewable decision had nowhere to record it. Domain services
 * call this so the decision survives independently of the record it changed.
 */
export function appendAuditLog(entry: {
  userName: string;
  action: string;
  entity: string;
  description: string;
  deviceName?: string;
}): void {
  mockDatabase.auditLogs.unshift({
    id: `aud-${mockDatabase.auditLogs.length + 1}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName: entry.userName,
    action: entry.action,
    entity: entry.entity,
    description: entry.description,
    ipAddress: "—",
    deviceName: entry.deviceName ?? "Admin Console",
  });
}
