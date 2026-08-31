<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { PhGearSix, PhGraduationCap, PhInfo, PhList, PhSignOut, PhUserCircle } from "@phosphor-icons/vue";

import { BaseAvatar, BaseButton, BaseConfirmDialog, BaseDialog, BaseMenu } from "../../shared/components/base";
import type { BaseMenuItem } from "../../shared/components/base";
import AppSidebarNav from "../../components/navigation/AppSidebarNav.vue";
import AppThemeToggle from "../../components/navigation/AppThemeToggle.vue";
import { adminNavigationEntries } from "../router/adminNavigation";
import { useAttendanceCorrectionsStore, useMomentsStore, useNavigationStore } from "../../shared/stores";
import { useAuthStore } from "../../modules/authentication";

const navigationStore = useNavigationStore();
const correctionsStore = useAttendanceCorrectionsStore();
const momentsStore = useMomentsStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const profileMenu = ref();
const showProfileDialog = ref(false);
const showLogoutConfirm = ref(false);
const showAboutDialog = ref(false);

/**
 * Live counts on the sidebar.
 *
 * This is the entire notification surface, on purpose. There is no delivery
 * mechanism to fake and nothing to configure: a number appears when there is
 * genuinely something waiting, next to the page that resolves it, and vanishes
 * when there is not. Both counts come from the same collections the pages read.
 */
const navBadges = computed<Record<string, number>>(() => ({
  attendance: correctionsStore.pendingCount,
  "team-moments": momentsStore.summary?.activeMoments ?? 0,
}));

/** Refresh on every navigation: a request may have been raised elsewhere. */
async function refreshBadges() {
  await Promise.all([correctionsStore.refreshPendingCount(), momentsStore.loadGallery()]);
}

onMounted(refreshBadges);
watch(() => route.path, refreshBadges);

const userRoleLabel = computed(() =>
  authStore.role === "administrator" ? "Administrator" : authStore.role === "student" ? "Student" : "User",
);

/**
 * The topbar states where you are, never what the page is called — the page header
 * owns the title, so repeating it here would be a second title on every screen.
 */
const locationLabel = computed(() => (route.meta.title as string | undefined) ?? "Administration");

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
          <PhGraduationCap weight="fill" />
        </div>
        <div class="brand-panel__copy">
          <p class="brand-panel__name">Pica Ponto</p>
          <p class="brand-panel__tagline">Administration</p>
        </div>
      </div>

      <AppSidebarNav
        :entries="adminNavigationEntries"
        nav-label="Admin workspace"
        :collapsed="navigationStore.isSidebarCollapsed"
        :badges="navBadges"
      />
    </aside>

    <div class="app-shell__content">
      <header class="topbar">
        <div class="topbar__leading">
          <button
            class="topbar__toggle"
            type="button"
            aria-label="Toggle navigation"
            @click="navigationStore.toggleSidebar"
          >
            <PhList weight="regular" />
          </button>
          <span class="topbar__workspace">
            <span class="topbar__workspace-name">{{ locationLabel }}</span>
            <span class="topbar__workspace-context">Administration workspace</span>
          </span>
        </div>

        <div class="topbar__actions">
          <AppThemeToggle />
          <BaseButton class="topbar__profile-trigger" severity="secondary" @click="profileMenu.toggle($event)">
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
