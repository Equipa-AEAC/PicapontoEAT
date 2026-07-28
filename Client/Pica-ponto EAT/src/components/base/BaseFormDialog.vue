<script setup lang="ts">
import Dialog from "primevue/dialog";
import Button from "primevue/button";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    subtitle?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    dismissableMask?: boolean;
  }>(),
  {
    confirmLabel: "Save",
    cancelLabel: "Cancel",
    loading: false,
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
  <Dialog
    class="base-form-dialog"
    :visible="props.visible"
    modal
    :dismissableMask="props.dismissableMask"
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
        <Button :label="props.cancelLabel" severity="secondary" text :disabled="props.loading" @click="emit('cancel')" />
        <Button :label="props.confirmLabel" :loading="props.loading" @click="emit('confirm')" />
      </div>
    </template>
  </Dialog>
</template>
