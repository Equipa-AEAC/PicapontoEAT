import type { Component } from "vue";

/**
 * One destination in a workspace sidebar. `description` is used as the route
 * subtitle, not as a second line in the sidebar — a nav entry shows its label only.
 */
export interface NavigationItem {
  name: string;
  path: string;
  label: string;
  description: string;
  icon: Component;
}

/**
 * A titled cluster of related destinations, rendered under a non-clickable header.
 * Groups exist so a workspace with a sub-area (Project Management) can show that
 * area's pages as subsection navigation rather than as more primary entries.
 */
export interface NavigationGroup {
  kind: "group";
  /** Stable id, used as the render key and to remember the expanded state. */
  name: string;
  label: string;
  icon: Component;
  items: NavigationItem[];
}

/** A primary entry sitting at the root of the sidebar. */
export interface NavigationLink extends NavigationItem {
  kind: "link";
}

/** What the sidebar actually iterates over. */
export type NavigationEntry = NavigationLink | NavigationGroup;

export function isNavigationGroup(entry: NavigationEntry): entry is NavigationGroup {
  return entry.kind === "group";
}

/** Flattens a sidebar definition into the routable items behind it. */
export function flattenNavigation(entries: NavigationEntry[]): NavigationItem[] {
  return entries.flatMap((entry) => (isNavigationGroup(entry) ? entry.items : [entry]));
}
