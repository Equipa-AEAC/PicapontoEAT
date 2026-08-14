<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";
import { PhGearSix, PhInfo, PhList, PhSignOut, PhSparkle, PhUserCircle } from "@phosphor-icons/vue";

import { BaseAvatar, BaseButton, BaseConfirmDialog, BaseDialog, BaseMenu } from "../../shared/components/base";
import type { BaseMenuItem } from "../../shared/components/base";
import { adminNavigationItems } from "../router/adminNavigation";
import { useNavigationStore } from "../../shared/stores";
import { useAuthStore } from "../../modules/authentication";

const navigationStore = useNavigationStore();
const authStore = useAuthStore();
const router = useRouter();
const profileMenu = ref();
const showProfileDialog = ref(false);
const showLogoutConfirm = ref(false);
const showAboutDialog = ref(false);

const userRoleLabel = computed(() => (authStore.role === "administrator" ? "Administrator" : authStore.role === "student" ? "Student" : "User"));

const profileMenuItems: BaseMenuItem[] = [
  { label: "My Profile", icon: PhUserCircle, command: () => { showProfileDialog.value = true; } },
  { label: "Settings", icon: PhGearSix, command: () => router.push({ name: "settings" }) },
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
  <div class="app-shell" :class="{ 'app-shell--collapsed': navigationStore.isSidebarCollapsed }">
    <aside class="app-shell__sidebar">
      <div class="brand-panel">
        <div class="brand-panel__mark" aria-hidden="true">
          <PhSparkle weight="bold" />
        </div>
        <div class="brand-panel__copy">
          <p class="brand-panel__name">Pica Ponto</p>
          <p class="brand-panel__tagline">Attendance management</p>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Admin workspace">
        <RouterLink
          v-for="item in adminNavigationItems"
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
        <div class="topbar__leading">
          <button class="topbar__toggle" type="button" aria-label="Toggle navigation" @click="navigationStore.toggleSidebar">
            <PhList weight="bold" />
          </button>
        </div>

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
          <BaseMenu ref="profileMenu" :model="profileMenuItems" />
        </div>
      </header>

      <main class="app-shell__main">
        <RouterView />
      </main>
    </div>

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
</template>
