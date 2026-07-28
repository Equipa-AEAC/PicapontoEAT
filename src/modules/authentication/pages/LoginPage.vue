<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import LoginForm from "../components/LoginForm.vue";
import { useAuthStore } from "../stores/auth";
import type { LoginPayload } from "../types/auth";

const APP_VERSION = "0.1.0";
const router = useRouter();
const authStore = useAuthStore();
const errorMessage = ref<string | null>(null);

async function handleLogin(payload: LoginPayload) {
  errorMessage.value = null;

  try {
    const session = await authStore.login(payload);

    if (session.role === "administrator") {
      router.push({ name: "dashboard" });
      return;
    }

    router.push({ name: "student-dashboard" });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to sign in.";
  }
}
</script>

<template>
  <LoginForm :loading="authStore.loading" :error-message="errorMessage" :app-version="APP_VERSION" @submit="handleLogin" />
</template>
