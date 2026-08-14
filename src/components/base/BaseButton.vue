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
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  color: #04101f;
  background: linear-gradient(180deg, var(--primary), var(--primary-strong));
  box-shadow: 0 12px 24px rgba(79, 140, 255, 0.24);
  transition: transform 140ms ease, border-color 140ms ease, background-color 140ms ease, opacity 140ms ease;
}

.base-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}

.base-button--secondary {
  color: var(--text-primary);
  background: rgba(17, 26, 42, 0.78);
  border-color: var(--surface-border);
  box-shadow: none;
}

.base-button--danger {
  color: #2a0707;
  background: linear-gradient(180deg, #f88c8c, var(--danger));
  box-shadow: 0 12px 24px rgba(244, 111, 111, 0.24);
}

.base-button--outlined {
  background: transparent;
  color: var(--text-primary);
  border-color: rgba(122, 167, 255, 0.32);
  box-shadow: none;
}

.base-button--outlined:hover:not(:disabled) {
  border-color: rgba(122, 167, 255, 0.48);
}

.base-button--outlined.base-button--danger {
  color: var(--danger);
  border-color: rgba(244, 111, 111, 0.4);
}

.base-button--text {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
  box-shadow: none;
  padding-left: 10px;
  padding-right: 10px;
}

.base-button--text:hover:not(:disabled) {
  color: var(--text-primary);
}

.base-button--text.base-button--danger {
  color: var(--danger);
  background: transparent;
}

.base-button--small {
  padding: 7px 14px;
  font-size: 0.84rem;
}

.base-button__content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.base-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: currentColor;
  animation: base-button-spin 700ms linear infinite;
}

@keyframes base-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
