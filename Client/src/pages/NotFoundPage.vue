<script setup lang="ts">
import { RouterLink } from "vue-router";
import Button from "primevue/button";

import BaseCard from "../components/base/BaseCard.vue";
</script>

<template>
  <main class="not-found-page">
    <BaseCard title="Page not found" description="The requested route is not available in this workspace.">
      <template #footer>
        <RouterLink class="not-found-page__link" to="/">
          <Button label="Return to dashboard" />
        </RouterLink>
      </template>
    </BaseCard>
  </main>
</template>