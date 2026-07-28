<script setup lang="ts">
import DataTable from "primevue/datatable";

defineProps<{
  value: unknown[];
  dataKey?: string;
  loading?: boolean;
  paginator?: boolean;
  rows?: number;
  scrollHeight?: string;
  rowClass?: (data: unknown) => string | Record<string, boolean> | undefined;
  selection?: unknown[] | unknown | null;
  selectionMode?: "single" | "multiple";
  metaKeySelection?: boolean;
}>();

defineEmits<{
  rowClick: [event: unknown];
  "update:selection": [value: unknown[] | unknown | null];
}>();
</script>

<template>
  <DataTable
    class="base-table"
    :value="value"
    :dataKey="dataKey"
    :loading="loading"
    :paginator="paginator"
    :rows="rows"
    :scrollHeight="scrollHeight"
    :rowClass="rowClass"
    :selection="selection"
    :selectionMode="selectionMode"
    :metaKeySelection="metaKeySelection"
    stripedRows
    removableSort
    @row-click="$emit('rowClick', $event)"
    @update:selection="$emit('update:selection', $event)"
  >
    <template #loading>
      <slot name="loading">
        <div class="base-table__loading">Loading records...</div>
      </slot>
    </template>

    <template #empty>
      <slot name="empty">
        <div class="base-table__empty">No records found.</div>
      </slot>
    </template>

    <template #header>
      <slot name="header" />
    </template>

    <template #footer>
      <slot name="footer" />
    </template>

    <slot />
  </DataTable>
</template>
