<script setup lang="ts">
import BaseDialog from "./BaseDialog.vue";
import BaseButton from "./BaseButton.vue";
import { t } from "../../i18n";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    message: string;
    severity?: "primary" | "danger";
    loading?: boolean;
    /**
     * Defaults to "Delete" for the danger severity and "Confirm" otherwise.
     *
     * Both defaults are weak: a confirmation whose button says what will happen
     * ("Remove task", "Sign out") is always better than one that says "Confirm",
     * so callers are expected to pass this. The default exists so a missing one
     * is harmless, not so it can be relied on.
     */
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    severity: "danger",
    loading: false,
    confirmLabel: undefined,
    cancelLabel: undefined,
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
        <BaseButton
          :label="props.cancelLabel ?? t('common.actions.cancel')"
          severity="secondary"
          text
          :disabled="props.loading"
          @click="emit('cancel')"
        />
        <BaseButton
          :label="
            props.confirmLabel ??
            (props.severity === 'danger' ? t('common.actions.delete') : t('common.actions.confirm'))
          "
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
  color: var(--foreground-secondary);
}

.base-confirm-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
