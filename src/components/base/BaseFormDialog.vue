<script setup lang="ts">
import BaseDialog from "./BaseDialog.vue";
import BaseButton from "./BaseButton.vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    subtitle?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    /** Block confirm while the form is invalid, without hiding the button. */
    confirmDisabled?: boolean;
    dismissableMask?: boolean;
  }>(),
  {
    confirmLabel: "Save",
    cancelLabel: "Cancel",
    loading: false,
    confirmDisabled: false,
    dismissableMask: true,
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
    class="base-form-dialog"
    :visible="props.visible"
    :dismissable-mask="props.dismissableMask"
    :closable="!props.loading"
    :header="props.title"
    @update:visible="emit('update:visible', $event)"
  >
    <p v-if="props.subtitle" class="base-form-dialog__subtitle">{{ props.subtitle }}</p>

    <div class="base-form-dialog__body">
      <slot />
    </div>

    <template #footer>
      <div class="base-form-dialog__footer">
        <BaseButton :label="props.cancelLabel" severity="secondary" text :disabled="props.loading" @click="emit('cancel')" />
        <BaseButton :label="props.confirmLabel" :loading="props.loading" :disabled="props.confirmDisabled" @click="emit('confirm')" />
      </div>
    </template>
  </BaseDialog>
</template>

<style>
.base-form-dialog__subtitle {
  margin: 0 0 16px;
  color: var(--foreground-secondary);
  font-size: 0.9rem;
}

.base-form-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.base-form-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
