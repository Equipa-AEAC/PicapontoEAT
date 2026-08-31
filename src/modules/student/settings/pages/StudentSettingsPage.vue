<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PhDesktop, PhMoon, PhSun } from "@phosphor-icons/vue";

import { BaseErrorState, BaseButton, BaseCard, BasePageHeader } from "../../../../shared/components/base";
import { useAuthStore } from "../../../../modules/authentication";
import { usePortalStore, useThemeStore } from "../../../../shared/stores";
import type { ThemeMode } from "../../../../shared/types";

/**
 * Student settings.
 *
 * This page deliberately only offers preferences that actually take effect. A
 * student cannot edit their own record — the school owns it — so the honest
 * shape here is: the one preference they do control (appearance), plus the
 * account actions that are genuinely theirs. Their record lives on Profile —
 * repeating it here would just be a second copy of the same page.
 *
 * Notification toggles are absent on purpose: nothing in the platform delivers
 * notifications yet, and a switch that silently does nothing is worse than no
 * switch at all.
 */
const router = useRouter();
const portalStore = usePortalStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");

const themeStore = useThemeStore();
const authStore = useAuthStore();

const profile = computed(() => portalStore.summary?.profile);

const themeOptions: { value: ThemeMode; label: string; hint: string; icon: typeof PhSun }[] = [
  { value: "light", label: "Light", hint: "Best in a bright room", icon: PhSun },
  { value: "dark", label: "Dark", hint: "Best in the lab", icon: PhMoon },
  { value: "system", label: "Match system", hint: "Follows your device", icon: PhDesktop },
];

async function signOut() {
  await authStore.logout();
  await router.push({ name: "login" });
}

onMounted(async () => {
  if (!portalStore.summary) {
    await portalStore.loadPortalSummary(memberId.value);
  }
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader title="Settings" description="How the portal looks on this device, and the account you are signed in with." />

    <BaseErrorState
      v-if="portalStore.errorMessage"
      :message="portalStore.errorMessage"
      @retry="portalStore.loadPortalSummary(memberId)"
    />

    <BaseCard
      title="Appearance"
      description="Applies to this device only, and is remembered the next time you sign in here."
    >
      <div class="theme-choice" role="radiogroup" aria-label="Colour theme">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="theme-choice__option"
          :class="{ 'theme-choice__option--active': themeStore.mode === option.value }"
          :aria-checked="themeStore.mode === option.value"
          @click="themeStore.setMode(option.value)"
        >
          <component :is="option.icon" weight="regular" />
          <span class="theme-choice__label">{{ option.label }}</span>
          <span class="theme-choice__hint type-meta">{{ option.hint }}</span>
        </button>
      </div>
    </BaseCard>

    <BaseCard title="Access" description="Your password is issued by the school and reset in person.">
      <p class="type-body-secondary access-note">
        Signed in as <strong>{{ authStore.currentUser?.fullName ?? profile?.fullName ?? 'this account' }}</strong>. To reset
        your password, ask the coordination team — there is no self-service reset.
      </p>

      <template #footer>
        <BaseButton label="Open my profile" severity="secondary" text @click="router.push({ name: 'student-profile' })" />
        <BaseButton label="Sign out" severity="danger" outlined @click="signOut" />
      </template>
    </BaseCard>
  </section>
</template>

<style scoped>
.theme-choice {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
}

.theme-choice__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  gap: 0 var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
}

.theme-choice__option:hover {
  background: var(--hover);
}

.theme-choice__option--active {
  border-color: var(--primary);
  background: var(--primary-subtle);
}

.theme-choice__option svg {
  grid-row: span 2;
  width: 20px;
  height: 20px;
  color: var(--foreground-secondary);
}

.theme-choice__option--active svg {
  color: var(--primary);
}

.theme-choice__label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}






.access-note {
  margin: 0;
}

</style>
