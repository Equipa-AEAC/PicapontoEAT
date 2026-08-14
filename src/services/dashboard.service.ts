import { markRaw } from "vue";
import { PhClockCounterClockwise, PhFingerprint, PhTrendUp, PhUsersThree } from "@phosphor-icons/vue";

import type { DashboardActivity, DashboardMetric } from "../types/dashboard";

import { mockDatabase } from "./mockDatabase";
import { mockRequest } from "./mockTransport";

export async function getDashboardMetrics(): Promise<DashboardMetric[]> {
  return mockRequest(() => {
    const present = mockDatabase.attendance.filter((item) => item.status === "present").length;
    const pendingCorrections = mockDatabase.attendance.filter((item) => item.corrections > 0).length;
    const weeklyHours = mockDatabase.attendance.reduce((total, item) => total + (item.hours ?? 0), 0);

    return [
      {
        label: "Today's attendance",
        value: String(mockDatabase.attendance.length),
        caption: "Validated scans and manual records",
        trendLabel: "+12% vs last week",
        trendTone: "positive",
        // markRaw: these land in a store ref, and Vue warns if a component is made reactive.
        icon: markRaw(PhFingerprint),
      },
      {
        label: "Currently present",
        value: String(present),
        caption: "Members checked in right now",
        trendLabel: "Live count",
        trendTone: "positive",
        icon: markRaw(PhUsersThree),
      },
      {
        label: "Weekly hours",
        value: String(Math.round(weeklyHours)),
        caption: "Attendance hours logged this week",
        trendLabel: "+8% vs last week",
        trendTone: "positive",
        icon: markRaw(PhTrendUp),
      },
      {
        label: "Pending corrections",
        value: String(pendingCorrections),
        caption: "Attendance records awaiting review",
        trendLabel: pendingCorrections > 0 ? "Needs attention" : "All clear",
        trendTone: pendingCorrections > 0 ? "negative" : "positive",
        icon: markRaw(PhClockCounterClockwise),
      },
    ];
  });
}

export async function getDashboardActivity(): Promise<DashboardActivity[]> {
  return mockRequest(() => [
    { id: "1", title: "RFID scan accepted", description: "Ana Beatriz Souza checked in at Terminal A.", timestamp: "2 minutes ago", tone: "success" },
    { id: "2", title: "Correction pending", description: "Bruno Henrique Costa needs a manual attendance fix.", timestamp: "12 minutes ago", tone: "warning" },
    { id: "3", title: "Daily log submitted", description: "Carolina Mendes Rocha logged 4h on the RFID terminals project.", timestamp: "35 minutes ago", tone: "info" },
    { id: "4", title: "Report exported", description: "Attendance summary preview is ready for download.", timestamp: "40 minutes ago", tone: "info" },
  ]);
}
