<script setup lang="ts">
import { reactive } from "vue";

import BaseButton from "../../../components/base/BaseButton.vue";
import BaseCheckbox from "../../../components/base/BaseCheckbox.vue";
import BaseTextInput from "../../../components/base/BaseTextInput.vue";
import type { LoginPayload } from "../types/auth";

const props = defineProps<{
  loading?: boolean;
  errorMessage?: string | null;
  appVersion: string;
}>();

const emit = defineEmits<{
  submit: [payload: LoginPayload];
}>();

const form = reactive<LoginPayload>({
  email: "",
  password: "",
  rememberMe: true,
});

function submit() {
  emit("submit", {
    email: form.email,
    password: form.password,
    rememberMe: form.rememberMe,
  });
}
</script>

<template>
  <section class="login-card">
    <div class="login-card__brand">
      <img src="/vite.svg" alt="School logo" class="login-card__logo" />
      <h1>Pica Ponto</h1>
      <p>RFID Attendance Platform</p>
    </div>

    <form class="login-card__form" @submit.prevent="submit">
      <label>
        <span>Email</span>
        <BaseTextInput v-model="form.email" type="email" autocomplete="username" placeholder="admin@school.local" />
      </label>

      <label>
        <span>Password</span>
        <BaseTextInput v-model="form.password" type="password" autocomplete="current-password" placeholder="password" />
      </label>

      <div class="login-card__row">
        <label class="login-card__remember">
          <BaseCheckbox v-model="form.rememberMe" />
          <span>Remember me</span>
        </label>
        <button type="button" class="login-card__link">Forgot password</button>
      </div>

      <p v-if="props.errorMessage" class="login-card__error">{{ props.errorMessage }}</p>

      <BaseButton type="submit" label="Sign In" :loading="props.loading" />
    </form>

    <footer class="login-card__footer">Version {{ props.appVersion }}</footer>
  </section>
</template>

<style scoped>
.login-card {
  width: min(420px, 92vw);
  padding: 1.5rem;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
  display: grid;
  gap: 1rem;
}

.login-card__brand {
  text-align: center;
}

.login-card__logo {
  width: 56px;
  height: 56px;
}

.login-card__brand h1 {
  margin: 0.5rem 0 0.25rem;
}

.login-card__brand p {
  margin: 0;
  color: #94a3b8;
}

.login-card__form {
  display: grid;
  gap: 0.75rem;
}

.login-card__form label {
  display: grid;
  gap: 0.35rem;
}

.login-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login-card__remember {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.login-card__link {
  background: none;
  border: none;
  color: #60a5fa;
  cursor: pointer;
}

.login-card__error {
  color: #f87171;
  margin: 0;
}

.login-card__footer {
  text-align: center;
  color: #64748b;
}
</style>