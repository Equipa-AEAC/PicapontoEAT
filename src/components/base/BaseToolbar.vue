<template>
  <div class="base-toolbar">
    <div class="base-toolbar__left">
      <slot name="left" />
    </div>
    <div class="base-toolbar__right">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.base-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  border: var(--border-width) solid var(--border);
  background: var(--surface);
}

.base-toolbar__left {
  flex: 1 1 320px;
  min-width: 0;
}

.base-toolbar__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
