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
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--surface-border);
  background: rgba(15, 23, 42, 0.46);
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
