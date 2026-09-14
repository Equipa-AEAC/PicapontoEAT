<script setup lang="ts">
import { watch } from "vue";
import { PhX } from "@phosphor-icons/vue";
import { t } from "../../i18n";

/*
 * The root is a `<Teleport>`, so Vue has no single element to fall attributes
 * through to and drops them with a warning. Every caller that passed a class —
 * `base-form-dialog`, `base-confirm-dialog`, `app-profile-dialog` — was passing
 * it into nothing. Attributes are bound to the dialog box explicitly instead.
 */
defineOptions({ inheritAttrs: false });

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
        <div v-bind="$attrs" class="base-dialog" role="dialog" aria-modal="true">
          <header v-if="header || closable" class="base-dialog__header">
            <h3 v-if="header" class="base-dialog__title">{{ header }}</h3>
            <button v-if="closable" type="button" class="base-dialog__close" :aria-label="t('common.actions.close')" @click="close">
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
  padding: var(--space-6);
  background: var(--overlay);
}

/*
 * The dialog is the scroll *container*, not the scroller. Scrolling the whole
 * box took the header and the confirm button with it: on the member form — a
 * twelve-field grid — "Save" sat below the fold and the reader had to scroll
 * past every field to find it. The body scrolls; the header and footer stay.
 */
.base-dialog {
  width: min(560px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  border: var(--border-width) solid var(--border);
  background: var(--surface-elevated);
  box-shadow: var(--shadow-lg);
}

.base-dialog__header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-bottom: var(--border-width) solid var(--border);
}

.base-dialog__title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--foreground);
}

.base-dialog__close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--foreground-muted);
  background: transparent;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.base-dialog__close:hover {
  background: var(--hover);
  color: var(--foreground);
}

.base-dialog__close svg {
  width: 16px;
  height: 16px;
}

.base-dialog__body {
  /* `min-height: 0` or a flex child refuses to shrink below its content. */
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-5);
}

.base-dialog__footer {
  flex: none;
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: var(--border-width) solid var(--border);
  background: var(--surface-subtle);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
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
