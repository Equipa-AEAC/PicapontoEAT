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
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: var(--border-width) solid var(--border);
  background: var(--surface);
}

.base-loading__bar {
  height: 10px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--skeleton) 25%, var(--track) 37%, var(--skeleton) 63%);
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
