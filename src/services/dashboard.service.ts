import type { DashboardActivity, DashboardMetric } from "../types/dashboard";

import { mockDatabase } from "./mockDatabase";
import { mockRequest } from "./mockTransport";

export async function getDashboardMetrics(): Promise<DashboardMetric[]> {
  return mockRequest(() => [
    {
      label: "Today's attendance",
      value: String(mockDatabase.attendance.length),
      caption: "Validated scans and manual records",
      trendLabel: "+12% vs last week",
      trendTone: "positive",
      icon: null as never,
    },
    {
      label: "Current students present",
      value: String(mockDatabase.attendance.filter((item) => item.status === "present").length),
      caption: "Checked-in students right now",
      trendLabel: "Live count",
      trendTone: "positive",
      icon: null as never,
    },
    {
      label: "Weekly hours",
      value: "254",
      caption: "Tracked across active internships",
      trendLabel: "+8% vs last week",
      trendTone: "positive",
      icon: null as never,
    },
    {
      label: "Pending corrections",
      value: String(mockDatabase.attendance.filter((item) => item.corrections > 0).length),
      caption: "Attendance records awaiting review",
      trendLabel: "Needs attention",
      trendTone: "neutral",
      icon: null as never,
    },
  ]);
}

export async function getDashboardActivity(): Promise<DashboardActivity[]> {
  return mockRequest(() => [
    { id: "1", title: "RFID scan accepted", description: "Ana Beatriz Souza checked in at Terminal A.", timestamp: "2 minutes ago", tone: "success" },
    { id: "2", title: "Correction pending", description: "Bruno Henrique Costa needs a manual attendance fix.", timestamp: "12 minutes ago", tone: "warning" },
    { id: "3", title: "Report exported", description: "Attendance summary preview is ready for download.", timestamp: "40 minutes ago", tone: "info" },
  ]);
}