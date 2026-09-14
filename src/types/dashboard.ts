import type { Component } from "vue";

export type TrendTone = "positive" | "neutral" | "negative";
export type StatusTone = "success" | "warning" | "danger" | "info";

/**
 * One headline figure on the dashboard.
 *
 * The words are carried as **translation keys**, not as text. The service
 * produces these once and the store holds them, so a translated string would be
 * frozen in whichever language was active when the dashboard was last fetched —
 * switching language left the metric row in the old one while everything around
 * it changed. Keys are resolved in the template, which re-renders.
 */
export interface DashboardMetric {
  /** i18n key for the metric's name. */
  labelKey: string;
  value: string;
  /** i18n key for the line under the value. */
  captionKey: string;
  /**
   * Optional: only present when the data supports a real, computed signal.
   * `trendParams` fills placeholders in `trendKey`.
   */
  trendKey?: string;
  trendParams?: Record<string, unknown>;
  trendTone?: TrendTone;
  icon: Component;
}

/**
 * One row of the dashboard's activity strip.
 *
 * `titleKey` follows the same rule as `DashboardMetric`: the words are resolved
 * where they are rendered, so the strip changes language with everything else.
 * `titleParams` for an audit row carries the *raw* `entity`/`action` values,
 * not `auditEntityLabel(...)`/`auditActionLabel(...)` already resolved — those
 * are vocabulary lookups, and calling them at fetch time bakes in whichever
 * language was active then. The template resolves them.
 *
 * `description` is different, and deliberately so. It is the text an audit
 * record was *written with*, and an audit trail records what happened in the
 * words it happened in — translating it afterwards would rewrite a record. It
 * is only ever set for audit-log rows.
 *
 * A daily-log row instead sets `descriptionKey`/`descriptionParams`: the
 * sentence itself is synthesised (never recorded), so it belongs with
 * everything else that is resolved at render time.
 *
 * A project-event row sets `messageKey`/`messageParams`/`messageSummary` (the
 * shape `formatActivity` reads) plus `actorName`, so the underlying event's own
 * message is re-resolved on every render rather than flattened into English or
 * Portuguese once at fetch time and frozen there.
 *
 * See docs/ai/BACKEND_CONTRACTS.md.
 */
export interface DashboardActivity {
  id: string;
  titleKey: string;
  titleParams?: Record<string, unknown>;
  /** Set only for audit-log rows — see above. */
  description?: string;
  descriptionKey?: string;
  descriptionParams?: Record<string, unknown>;
  messageKey?: string | null;
  messageParams?: Record<string, string> | null;
  messageSummary?: string;
  actorName?: string;
  timestamp: string;
  tone: StatusTone;
}

export interface AttendanceScanPayload {
  deviceId: string;
  uid: string;
  timestamp: string;
  firmware: string;
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  scanType: "entry" | "exit";
  status: "accepted" | "rejected" | "pending";
  createdAt: string;
}