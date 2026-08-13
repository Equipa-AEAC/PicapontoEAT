<script setup lang="ts">
import { watch } from "vue";
import { PhX } from "@phosphor-icons/vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    header?: string;
    closable?: boolean;
    dismissableMask?: boolean;
  }>(),
  {
    header: undefined,
    closable: true,
    dismissableMask: true,
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
}>();

function close() {
  if (props.closable) {
    emit("update:visible", false);
  }
}

function onMaskClick() {
  if (props.dismissableMask) {
    close();
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close();
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      window.addEventListener("keydown", onKeydown);
    } else {
      window.removeEventListener("keydown", onKeydown);
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="base-dialog-fade">
      <div v-if="visible" class="base-dialog-mask" @mousedown.self="onMaskClick">
        <div class="base-dialog" role="dialog" aria-modal="true">
          <header v-if="header || closable" class="base-dialog__header">
            <h3 v-if="header" class="base-dialog__title">{{ header }}</h3>
            <button v-if="closable" type="button" class="base-dialog__close" aria-label="Close" @click="close">
              <PhX weight="bold" />
            </button>
          </header>

          <div class="base-dialog__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="base-dialog__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.base-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(4, 8, 16, 0.6);
  backdrop-filter: blur(4px);
}

.base-dialog {
  width: min(560px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-border);
  background: linear-gradient(180deg, rgba(20, 30, 48, 0.98), rgba(13, 20, 33, 0.98));
  box-shadow: var(--shadow-lg);
}

.base-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--surface-border);
}

.base-dialog__title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.base-dialog__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: var(--text-secondary);
  background: transparent;
}

.base-dialog__close:hover {
  background: rgba(148, 163, 184, 0.14);
  color: var(--text-primary);
}

.base-dialog__close svg {
  width: 16px;
  height: 16px;
}

.base-dialog__body {
  padding: 24px;
}

.base-dialog__footer {
  padding: 16px 24px 24px;
}

.base-dialog-fade-enter-active,
.base-dialog-fade-leave-active {
  transition: opacity 140ms ease;
}

.base-dialog-fade-enter-from,
.base-dialog-fade-leave-to {
  opacity: 0;
}
</style>
