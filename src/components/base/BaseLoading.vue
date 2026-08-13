<template>
  <div class="base-loading" aria-busy="true" aria-live="polite">
    <span class="base-loading__bar" />
    <span class="base-loading__bar" />
    <span class="base-loading__bar" />
  </div>
</template>

<style scoped>
.base-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-border);
  background: rgba(15, 23, 42, 0.46);
}

.base-loading__bar {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.12) 25%,
    rgba(148, 163, 184, 0.24) 37%,
    rgba(148, 163, 184, 0.12) 63%
  );
  background-size: 400% 100%;
  animation: base-loading-shimmer 1.4s ease infinite;
}

.base-loading__bar:nth-child(2) {
  width: 82%;
}

.base-loading__bar:nth-child(3) {
  width: 64%;
}

@keyframes base-loading-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
