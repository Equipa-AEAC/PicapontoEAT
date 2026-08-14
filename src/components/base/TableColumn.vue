<script setup lang="ts">
// Renderless column definition, read by BaseTable's default-slot vnode inspection.
// Never actually mounted/rendered — only its props and `#body` scoped slot are consumed.
defineProps<{
  field?: string;
  header?: string;
  sortable?: boolean;
  sortField?: string;
  selectionMode?: "single" | "multiple";
  width?: string;
}>();
</script>

<template><!-- column definition only --></template>
