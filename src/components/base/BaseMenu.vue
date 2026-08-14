<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from "vue";
import type { Component } from "vue";

export interface BaseMenuItem {
  label?: string;
  icon?: Component;
  separator?: boolean;
  command?: () => void;
}

defineProps<{
  model: BaseMenuItem[];
}>();

const visible = ref(false);
const position = reactive({ top: 0, right: 0 });

function toggle(event: MouseEvent) {
  if (visible.value) {
    close();
    return;
  }

  const target = (event.currentTarget ?? event.target) as HTMLElement;
  const rect = target.getBoundingClientRect();
  position.top = rect.bottom + 8;
  position.right = Math.max(16, window.innerWidth - rect.right);
  visible.value = true;
  window.addEventListener("mousedown", onOutsideClick, true);
  window.addEventListener("keydown", onKeydown);
}

function close() {
  visible.value = false;
  window.removeEventListener("mousedown", onOutsideClick, true);
  window.removeEventListener("keydown", onKeydown);
}

function onOutsideClick(event: MouseEvent) {
  const panel = document.getElementById("base-menu-panel");
  if (panel && !panel.contains(event.target as Node)) {
    close();
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    close();
  }
}

function select(item: BaseMenuItem) {
  item.command?.();
  close();
}

onBeforeUnmount(() => {
  window.removeEventListener("mousedown", onOutsideClick, true);
  window.removeEventListener("keydown", onKeydown);
});

defineExpose({ toggle, close });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      id="base-menu-panel"
      class="base-menu"
      :style="{ top: `${position.top}px`, right: `${position.right}px` }"
    >
      <template v-for="(item, index) in model" :key="index">
        <div v-if="item.separator" class="base-menu__separator" />
        <button v-else type="button" class="base-menu__item" @click="select(item)">
          <component :is="item.icon" v-if="item.icon" weight="bold" class="base-menu__icon" />
          <span>{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.base-menu {
  position: fixed;
  z-index: 1000;
  min-width: 220px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  background: linear-gradient(180deg, rgba(20, 30, 48, 0.98), rgba(13, 20, 33, 0.98));
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px);
}

.base-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  font-size: 0.9rem;
}

.base-menu__item:hover {
  background: rgba(122, 167, 255, 0.12);
}

.base-menu__icon {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
}

.base-menu__separator {
  height: 1px;
  margin: 6px 4px;
  background: var(--surface-border);
}
</style>
