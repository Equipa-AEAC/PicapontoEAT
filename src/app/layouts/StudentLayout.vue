<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";
import { PhGearSix, PhInfo, PhSignOut, PhStudent, PhUserCircle } from "@phosphor-icons/vue";

import { BaseAvatar, BaseButton, BaseConfirmDialog, BaseDialog, BaseMenu } from "../../shared/components/base";
import type { BaseMenuItem } from "../../shared/components/base";
import { useAuthStore } from "../../modules/authentication";
import { studentNavigationItems } from "../router/studentNavigation";

const router = useRouter();
const authStore = useAuthStore();
const profileMenu = ref();
const showProfileDialog = ref(false);
const showLogoutConfirm = ref(false);
const showAboutDialog = ref(false);

const userRoleLabel = computed(() => (authStore.role === "administrator" ? "Administrator" : authStore.role === "student" ? "Student" : "User"));

const profileMenuItems: BaseMenuItem[] = [
  { label: "My Profile", icon: PhUserCircle, command: () => { showProfileDialog.value = true; } },
  { label: "Settings", icon: PhGearSix, command: () => router.push({ name: "student-settings" }) },
  { label: "About", icon: PhInfo, command: () => { showAboutDialog.value = true; } },
  { separator: true },
  { label: "Logout", icon: PhSignOut, command: () => { showLogoutConfirm.value = true; } },
];

async function confirmLogout() {
  await authStore.logout();
  showLogoutConfirm.value = false;
  await router.replace({ name: "login" });
}
</script>

<template>
  <div class="app-shell student-shell">
    <aside class="app-shell__sidebar">
      <div class="brand-panel">
        <div class="brand-panel__mark" aria-hidden="true">
          <PhStudent weight="bold" />
        </div>
        <div class="brand-panel__copy">
          <p class="brand-panel__name">Student Workspace</p>
          <p class="brand-panel__tagline">Pica Ponto portal</p>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Student workspace">
        <RouterLink
          v-for="item in studentNavigationItems"
          :key="item.name"
          :to="item.path"
          class="sidebar-nav__item"
          active-class="sidebar-nav__item--active"
        >
          <span class="sidebar-nav__icon" aria-hidden="true">
            <component :is="item.icon" weight="bold" />
          </span>
          <span class="sidebar-nav__label">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="app-shell__content">
      <header class="topbar">
        <div class="topbar__leading" />

        <div class="topbar__actions">
          <BaseButton class="topbar__profile-trigger" severity="secondary" outlined @click="profileMenu.toggle($event)">
            <span class="topbar__profile-trigger-inner">
              <BaseAvatar :label="authStore.currentUser?.fullName ?? 'U'" size="normal" />
              <span class="topbar__profile-copy">
                <span class="topbar__profile-name">{{ authStore.currentUser?.fullName ?? 'User' }}</span>
                <span class="topbar__profile-role">{{ userRoleLabel }}</span>
              </span>
            </span>
          </BaseButton>
          <RouterLink to="/admin/dashboard">
            <BaseButton label="Open admin" severity="secondary" outlined />
          </RouterLink>
          <BaseMenu ref="profileMenu" :model="profileMenuItems" />
        </div>
      </header>

      <main class="app-shell__main">
        <RouterView />
      </main>

      <BaseConfirmDialog
        :visible="showLogoutConfirm"
        title="Confirm logout"
        message="This will clear your session and return you to the login screen."
        :loading="authStore.loading"
        @update:visible="showLogoutConfirm = $event"
        @confirm="confirmLogout"
        @cancel="showLogoutConfirm = false"
      />

      <BaseDialog :visible="showAboutDialog" header="About Pica Ponto" class="app-about-dialog" @update:visible="showAboutDialog = $event">
        <p>This workspace is the desktop attendance and member management application.</p>
        <p>Version: development build</p>
      </BaseDialog>

      <BaseDialog :visible="showProfileDialog" header="My Profile" class="app-profile-dialog" @update:visible="showProfileDialog = $event">
        <div class="app-profile-dialog__body">
          <BaseAvatar :label="authStore.currentUser?.fullName ?? 'U'" size="xlarge" />
          <div>
            <p>{{ authStore.currentUser?.fullName ?? 'User' }}</p>
            <p>{{ authStore.currentUser?.email ?? 'No email available' }}</p>
            <p>{{ userRoleLabel }}</p>
          </div>
        </div>
      </BaseDialog>
    </div>
  </div>
</template>

