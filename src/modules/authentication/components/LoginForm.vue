<script setup lang="ts">
import { reactive, ref } from "vue";

import BaseButton from "../../../components/base/BaseButton.vue";
import BaseCheckbox from "../../../components/base/BaseCheckbox.vue";
import BaseTextInput from "../../../components/base/BaseTextInput.vue";
import AppLanguageToggle from "../../../components/navigation/AppLanguageToggle.vue";
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

/**
 * There is no self-service reset: accounts are issued by the coordination team,
 * so the honest thing for this control to do is say who to ask rather than open
 * a flow that cannot complete.
 */
const showRecoveryHint = ref(false);

/** Where a password reset actually comes from. One place, so it cannot drift. */
const SUPPORT_EMAIL = "coordenacao@picaponto.edu";

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
    <!--
      The language switch belongs on this screen, not only inside the app.
      Somebody who lands in a language they cannot read has to be able to change
      it before they are asked to type anything.
    -->
    <div class="login-card__language">
      <AppLanguageToggle />
    </div>

    <div class="login-card__brand">
      <img src="/vite.svg" :alt="$t('auth.logoAlt')" class="login-card__logo" />
      <h1>{{ $t("shell.brand.name") }}</h1>
      <p>{{ $t("auth.tagline") }}</p>
    </div>

    <form class="login-card__form" @submit.prevent="submit">
      <label>
        <span>{{ $t("auth.email") }}</span>
        <BaseTextInput
          v-model="form.email"
          type="email"
          autocomplete="username"
          :placeholder="$t('auth.emailPlaceholder')"
        />
      </label>

      <label>
        <span>{{ $t("auth.password") }}</span>
        <BaseTextInput
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          :placeholder="$t('auth.passwordPlaceholder')"
        />
      </label>

      <div class="login-card__row">
        <label class="login-card__remember">
          <BaseCheckbox v-model="form.rememberMe" />
          <span>{{ $t("auth.rememberMe") }}</span>
        </label>
        <button
          type="button"
          class="login-card__link"
          :aria-expanded="showRecoveryHint"
          aria-controls="login-recovery-hint"
          @click="showRecoveryHint = !showRecoveryHint"
        >
          {{ $t("auth.forgotPassword") }}
        </button>
      </div>

      <i18n-t v-if="showRecoveryHint" keypath="auth.recoveryHint" tag="p" id="login-recovery-hint" class="login-card__hint">
        <template #email>
          <a :href="`mailto:${SUPPORT_EMAIL}`">{{ SUPPORT_EMAIL }}</a>
        </template>
      </i18n-t>

      <p v-if="props.errorMessage" class="login-card__error">{{ props.errorMessage }}</p>

      <BaseButton type="submit" :label="$t('auth.signIn')" :loading="props.loading" />
    </form>

    <footer class="login-card__footer">{{ $t("auth.version", { version: props.appVersion }) }}</footer>
  </section>
</template>

<style scoped>
.login-card {
  position: relative;
  width: min(400px, 92vw);
  padding: var(--space-7);
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: var(--border-width) solid var(--border);
  box-shadow: var(--shadow-md);
  display: grid;
  gap: var(--space-5);
}

.login-card__language {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
}

.login-card__brand {
  text-align: center;
}

.login-card__logo {
  width: 44px;
  height: 44px;
}

.login-card__brand h1 {
  margin: var(--space-3) 0 var(--space-1);
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  letter-spacing: var(--tracking-tight);
}

.login-card__brand p {
  margin: 0;
  color: var(--foreground-secondary);
  font-size: var(--text-sm);
}

.login-card__form {
  display: grid;
  gap: var(--space-4);
}

.login-card__form label {
  display: grid;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--foreground-secondary);
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
  padding: 0;
  color: var(--primary);
  font-size: var(--text-sm);
  cursor: pointer;
}

.login-card__link:hover {
  text-decoration: underline;
}

.login-card__hint {
  margin: 0;
  padding: var(--space-3);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-elevated);
  color: var(--foreground-secondary);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.login-card__hint a {
  color: var(--primary);
}

.login-card__error {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: var(--border-width) solid var(--danger-border);
  border-radius: var(--radius-md);
  background: var(--danger-subtle);
  color: var(--danger-foreground);
  font-size: var(--text-sm);
}

.login-card__footer {
  text-align: center;
  color: var(--foreground-muted);
  font-size: var(--text-xs);
}
</style>