export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  entity: string;
  description: string;
  ipAddress: string;
  deviceName: string;
}

export interface AuditFilters {
  query: string;
  entity: string | "all";
  action: string | "all";
  userName: string | "all";
}
