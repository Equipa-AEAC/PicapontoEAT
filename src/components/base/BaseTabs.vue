<script setup lang="ts">
import { computed, type Component } from "vue";

export interface BaseTabItem {
  /** Stable key used as the v-model value and as the slot name for the panel. */
  value: string;
  label: string;
  icon?: Component;
  /** Optional count rendered as a pill next to the label. */
  badge?: string | number;
}

const props = defineProps<{
  modelValue: string;
  tabs: BaseTabItem[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const activeIndex = computed(() => props.tabs.findIndex((tab) => tab.value === props.modelValue));

function select(value: string) {
  emit("update:modelValue", value);
}

/** Left/Right move between tabs, Home/End jump to the ends — standard tablist keys. */
function onKeydown(event: KeyboardEvent) {
  const lastIndex = props.tabs.length - 1;

  if (lastIndex < 0) {
    return;
  }

  let nextIndex: number | null = null;

  if (event.key === "ArrowRight") {
    nextIndex = activeIndex.value >= lastIndex ? 0 : activeIndex.value + 1;
  } else if (event.key === "ArrowLeft") {
    nextIndex = activeIndex.value <= 0 ? lastIndex : activeIndex.value - 1;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = lastIndex;
  }

  if (nextIndex === null) {
    return;
  }

  event.preventDefault();
  const nextTab = props.tabs[nextIndex];

  if (nextTab) {
    select(nextTab.value);
  }
}
</script>

<template>
  <div class="base-tabs">
    <div class="base-tabs__list" role="tablist" @keydown="onKeydown">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        class="base-tabs__tab"
        :class="{ 'base-tabs__tab--active': tab.value === modelValue }"
        :aria-selected="tab.value === modelValue"
        :tabindex="tab.value === modelValue ? 0 : -1"
        @click="select(tab.value)"
      >
        <component :is="tab.icon" v-if="tab.icon" weight="bold" />
        <span>{{ tab.label }}</span>
        <span v-if="tab.badge !== undefined" class="base-tabs__badge">{{ tab.badge }}</span>
      </button>
    </div>

    <div class="base-tabs__panel" role="tabpanel">
      <slot :name="modelValue">
        <slot />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.base-tabs {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.base-tabs__list {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: 0;
  overflow-x: auto;
  border-bottom: var(--border-width) solid var(--border);
}

.base-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
  padding: var(--space-3) 0;
  margin-bottom: -1px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--foreground-secondary);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.base-tabs__tab:hover {
  color: var(--foreground);
}

/* An underline rather than a filled segment: it reads as a section switch, not a button. */
.base-tabs__tab--active,
.base-tabs__tab--active:hover {
  color: var(--foreground);
  border-bottom-color: var(--primary);
  font-weight: var(--weight-semibold);
}

.base-tabs__tab svg {
  width: 16px;
  height: 16px;
}

.base-tabs__badge {
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--secondary-subtle);
  color: var(--foreground-secondary);
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  font-variant-numeric: tabular-nums;
}

.base-tabs__tab--active .base-tabs__badge {
  background: var(--primary-subtle);
  color: var(--primary-contrast);
}

.base-tabs__panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
