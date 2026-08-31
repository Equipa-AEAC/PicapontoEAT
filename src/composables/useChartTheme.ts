import { computed } from "vue";
import type { ChartOptions } from "chart.js";

import { useThemeStore } from "../stores/theme";

/**
 * Chart.js paints onto a canvas, so it cannot inherit CSS custom properties the way
 * the rest of the interface does — every colour has to be handed to it as a literal.
 *
 * This reads the resolved token values back off the document, which keeps the charts
 * on the same palette as everything else and means a theme switch repaints them with
 * no per-page colour constants. Reading is keyed to `resolvedTheme`, so the computed
 * values re-evaluate the moment the attribute on <html> changes.
 */
export interface ChartPalette {
  series: string[];
  grid: string;
  axis: string;
  surface: string;
  border: string;
  foreground: string;
  muted: string;
  track: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  primary: string;
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useChartTheme() {
  const themeStore = useThemeStore();

  const palette = computed<ChartPalette>(() => {
    // Referenced so the palette recomputes on a theme switch.
    void themeStore.resolvedTheme;

    return {
      series: [token("--chart-1"), token("--chart-2"), token("--chart-3"), token("--chart-4"), token("--chart-5"), token("--chart-6")],
      grid: token("--chart-grid"),
      axis: token("--chart-axis"),
      surface: token("--surface"),
      border: token("--border"),
      foreground: token("--foreground"),
      muted: token("--foreground-muted"),
      track: token("--track"),
      success: token("--success"),
      warning: token("--warning"),
      danger: token("--danger"),
      info: token("--info"),
      primary: token("--primary"),
    };
  });

  /**
   * Shared axis, legend and tooltip treatment. Vertical grid lines are dropped and
   * the remaining ones sit on the border token, so the data stays the loudest thing
   * in the frame.
   */
  const baseOptions = computed<ChartOptions>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    font: { family: "IBM Plex Sans Variable, IBM Plex Sans, Segoe UI, sans-serif" },
    plugins: {
      legend: {
        display: false,
        labels: { color: palette.value.muted, boxWidth: 10, boxHeight: 10, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: palette.value.surface,
        titleColor: palette.value.foreground,
        bodyColor: palette.value.muted,
        borderColor: palette.value.border,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: palette.value.grid },
        ticks: { color: palette.value.axis, font: { size: 11 } },
      },
      y: {
        grid: { color: palette.value.grid },
        border: { display: false },
        ticks: { color: palette.value.axis, font: { size: 11 }, precision: 0 },
        beginAtZero: true,
      },
    },
  }));

  return { palette, baseOptions, resolvedTheme: computed(() => themeStore.resolvedTheme) };
}
