<script setup lang="ts">
import BaseDialog from "./BaseDialog.vue";
import BaseButton from "./BaseButton.vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    message: string;
    severity?: "primary" | "danger";
    loading?: boolean;
    /** Defaults to "Delete" for the danger severity and "Confirm" otherwise. */
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    severity: "danger",
    loading: false,
    confirmLabel: undefined,
    cancelLabel: "Cancel",
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <BaseDialog
    class="base-confirm-dialog"
    :visible="props.visible"
    :closable="!props.loading"
    :header="props.title"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="base-confirm-dialog__message">{{ props.message }}</p>

    <template #footer>
      <div class="base-confirm-dialog__footer">
        <BaseButton :label="props.cancelLabel" severity="secondary" text :disabled="props.loading" @click="emit('cancel')" />
        <BaseButton
          :label="props.confirmLabel ?? (props.severity === 'danger' ? 'Delete' : 'Confirm')"
          :severity="props.severity === 'danger' ? 'danger' : 'primary'"
          :loading="props.loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </BaseDialog>
</template>

<style>
.base-confirm-dialog__message {
  margin: 0;
  color: var(--text-secondary);
}

.base-confirm-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
