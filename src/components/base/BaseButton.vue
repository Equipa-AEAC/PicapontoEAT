<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    severity?: "primary" | "secondary" | "danger";
    outlined?: boolean;
    text?: boolean;
    size?: "small" | "normal";
    loading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit";
  }>(),
  {
    label: undefined,
    severity: "primary",
    outlined: false,
    text: false,
    size: "normal",
    loading: false,
    disabled: false,
    type: "button",
  },
);
</script>

<template>
  <button
    class="base-button"
    :class="[
      `base-button--${severity}`,
      `base-button--${size}`,
      { 'base-button--outlined': outlined, 'base-button--text': text, 'base-button--loading': loading },
    ]"
    :type="type"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true" />
    <span class="base-button__content">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<style scoped>
/*
 * Buttons are rectangular with a small radius, a flat fill and no lift on hover.
 * The previous pill + gradient + translateY treatment is what made every screen
 * read as a marketing dashboard; state is now communicated by a colour step only.
 */
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-md);
  padding: 0 var(--space-4);
  height: 34px;
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  line-height: 1;
  white-space: nowrap;
  color: var(--primary-foreground);
  background: var(--primary);
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), opacity var(--transition-fast);
}

.base-button:hover:not(:disabled) {
  background: var(--primary-hover);
}

.base-button:active:not(:disabled) {
  background: var(--primary-active);
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.base-button svg {
  width: 16px;
  height: 16px;
  flex: none;
}

/* Secondary is the default for anything that is not the single primary action. */
.base-button--secondary {
  color: var(--foreground);
  background: var(--surface);
  border-color: var(--border-strong);
}

.base-button--secondary:hover:not(:disabled) {
  background: var(--hover);
  border-color: var(--foreground-subtle);
}

.base-button--secondary:active:not(:disabled) {
  background: var(--active);
}

.base-button--danger {
  color: var(--primary-foreground);
  background: var(--danger);
}

.base-button--danger:hover:not(:disabled) {
  background: var(--danger);
  opacity: 0.88;
}

.base-button--outlined {
  background: transparent;
  color: var(--primary);
  border-color: var(--primary-border);
}

.base-button--outlined:hover:not(:disabled) {
  background: var(--primary-subtle);
  border-color: var(--primary);
}

.base-button--outlined.base-button--secondary {
  color: var(--foreground);
  border-color: var(--border-strong);
}

.base-button--outlined.base-button--secondary:hover:not(:disabled) {
  background: var(--hover);
  border-color: var(--foreground-subtle);
}

.base-button--outlined.base-button--danger {
  color: var(--danger);
  background: transparent;
  border-color: var(--danger-border);
  opacity: 1;
}

.base-button--outlined.base-button--danger:hover:not(:disabled) {
  background: var(--danger-subtle);
  border-color: var(--danger);
  opacity: 1;
}

.base-button--text {
  background: transparent;
  color: var(--foreground-secondary);
  border-color: transparent;
  padding-left: var(--space-2);
  padding-right: var(--space-2);
}

.base-button--text:hover:not(:disabled) {
  color: var(--foreground);
  background: var(--hover);
}

.base-button--text.base-button--danger {
  color: var(--danger);
  background: transparent;
  opacity: 1;
}

.base-button--text.base-button--danger:hover:not(:disabled) {
  background: var(--danger-subtle);
  opacity: 1;
}

.base-button--small {
  height: 28px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

.base-button--small svg {
  width: 14px;
  height: 14px;
}

.base-button__content {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.base-button__spinner {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  opacity: 0.7;
  animation: base-button-spin 700ms linear infinite;
}

@keyframes base-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
