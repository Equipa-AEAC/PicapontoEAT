import type { Component } from "vue";

export type TrendTone = "positive" | "neutral" | "negative";
export type StatusTone = "success" | "warning" | "danger" | "info";

export interface DashboardMetric {
  label: string;
  value: string;
  caption: string;
  /** Optional: only present when the data supports a real, computed signal. */
  trendLabel?: string;
  trendTone?: TrendTone;
  icon: Component;
}

export interface DashboardActivity {
  id: string;
  title: string;
  description: string;
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