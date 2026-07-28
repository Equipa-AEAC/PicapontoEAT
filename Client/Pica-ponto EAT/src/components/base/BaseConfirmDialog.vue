<script setup lang="ts">
import Dialog from "primevue/dialog";
import Button from "primevue/button";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    message: string;
    severity?: "primary" | "danger";
    loading?: boolean;
  }>(),
  {
    severity: "danger",
    loading: false,
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
    class="base-confirm-dialog"
    :visible="props.visible"
    modal
    :closable="!props.loading"
    :header="props.title"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="base-confirm-dialog__message">{{ props.message }}</p>

    <template #footer>
      <div class="base-confirm-dialog__footer">
        <Button label="Cancel" severity="secondary" text :disabled="props.loading" @click="emit('cancel')" />
        <Button :label="props.severity === 'danger' ? 'Delete' : 'Confirm'" :severity="props.severity === 'danger' ? 'danger' : 'primary'" :loading="props.loading" @click="emit('confirm')" />
      </div>
    </template>
  </Dialog>
</template>
