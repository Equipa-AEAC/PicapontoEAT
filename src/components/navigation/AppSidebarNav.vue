<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { NavigationEntry } from "../../types/navigation";
import { isNavigationGroup } from "../../types/navigation";

/**
 * Workspace sidebar navigation.
 *
 * Handles both shapes a sidebar can hold: primary links at the root, and groups
 * whose pages render as indented subsection entries under a non-clickable header.
 * A group is expanded whenever the current route is inside it, so the surrounding
 * pages stay visible while you work in that area.
 */
const props = defineProps<{
  entries: NavigationEntry[];
  /** Accessible name for the <nav> landmark. */
  navLabel: string;
  /** Icons-only rail. Group headers and labels are hidden by layout CSS. */
  collapsed?: boolean;
  /**
   * Live counts keyed by nav entry name.
   *
   * This is the whole of the app's "notification" surface, and deliberately so:
   * it needs no delivery mechanism, it can only ever show a number the data
   * actually supports, and a zero renders nothing rather than a reassuring "0".
   */
  badges?: Record<string, number>;
}>();

const route = useRoute();

/** A group counts as current when any of its pages is the active route. */
function groupIsActive(entry: NavigationEntry): boolean {
  return isNavigationGroup(entry) && entry.items.some((item) => route.path.startsWith(item.path));
}

const activeGroups = computed(() => new Set(props.entries.filter(groupIsActive).map((entry) => entry.name)));

/** Null unless there is something to count, so nothing renders at zero. */
function badgeFor(name: string): number | null {
  const count = props.badges?.[name] ?? 0;

  return count > 0 ? count : null;
}

/** The rail hides labels and badges, so the count has to reach the tooltip. */
function titleFor(label: string, name: string): string {
  const count = badgeFor(name);

  return count === null ? label : `${label} (${count})`;
}
</script>

<template>
  <nav class="sidebar-nav" :aria-label="navLabel">
    <template v-for="entry in entries" :key="entry.name">
      <RouterLink
        v-if="!isNavigationGroup(entry)"
        :to="entry.path"
        class="sidebar-nav__item"
        active-class="sidebar-nav__item--active"
        :title="collapsed ? titleFor(entry.label, entry.name) : undefined"
      >
        <span class="sidebar-nav__icon" aria-hidden="true">
          <component :is="entry.icon" weight="regular" />
        </span>
        <span class="sidebar-nav__label">{{ entry.label }}</span>
        <span v-if="badgeFor(entry.name) !== null" class="sidebar-nav__badge">{{ badgeFor(entry.name) }}</span>
      </RouterLink>

      <div v-else class="sidebar-nav__group" :class="{ 'sidebar-nav__group--active': activeGroups.has(entry.name) }">
        <p class="sidebar-nav__group-label">
          <component :is="entry.icon" weight="regular" aria-hidden="true" />
          <span>{{ entry.label }}</span>
        </p>

        <RouterLink
          v-for="item in entry.items"
          :key="item.name"
          :to="item.path"
          class="sidebar-nav__item sidebar-nav__item--child"
          active-class="sidebar-nav__item--active"
          :title="collapsed ? `${entry.label} — ${titleFor(item.label, item.name)}` : undefined"
        >
          <span class="sidebar-nav__icon" aria-hidden="true">
            <component :is="item.icon" weight="regular" />
          </span>
          <span class="sidebar-nav__label">{{ item.label }}</span>
          <span v-if="badgeFor(item.name) !== null" class="sidebar-nav__badge">{{ badgeFor(item.name) }}</span>
        </RouterLink>
      </div>
    </template>
  </nav>
</template>
