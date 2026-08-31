<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { PhGearSix, PhInfo, PhList, PhSignOut, PhStudent, PhUserCircle } from "@phosphor-icons/vue";

import { BaseAvatar, BaseButton, BaseConfirmDialog, BaseDialog, BaseMenu } from "../../shared/components/base";
import type { BaseMenuItem } from "../../shared/components/base";
import AppSidebarNav from "../../components/navigation/AppSidebarNav.vue";
import AppThemeToggle from "../../components/navigation/AppThemeToggle.vue";
import { useAuthStore } from "../../modules/authentication";
import { useAnnouncementsStore, useInternshipsStore, useMomentsStore, useNavigationStore } from "../../shared/stores";
import { studentNavigationEntries } from "../router/studentNavigation";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const announcementsStore = useAnnouncementsStore();
const internshipsStore = useInternshipsStore();
const momentsStore = useMomentsStore();

/**
 * Live counts on the student sidebar.
 *
 * Same rule as the admin side: a number appears only when there is genuinely
 * something waiting, next to the page that resolves it, and nothing renders at
 * zero. Both counts come from the collections those pages already read.
 */
const navBadges = computed<Record<string, number>>(() => ({
  "student-announcements": announcementsStore.unreadCount,
  "student-moments": momentsStore.summary?.activeMoments ?? 0,
}));

async function refreshBadges() {
  const memberId = authStore.currentMemberId;

  if (!memberId) {
    return;
  }

  const program = internshipsStore.selectedInternship ? "official-internship" : "equipa-hours";

  await Promise.all([
    announcementsStore.refreshUnreadCount(memberId, program),
    momentsStore.loadGallery(),
  ]);
}

onMounted(refreshBadges);
watch(() => route.path, refreshBadges);

const navigationStore = useNavigationStore();
const profileMenu = ref();
const showProfileDialog = ref(false);
const showLogoutConfirm = ref(false);
const showAboutDialog = ref(false);

const userRoleLabel = computed(() =>
  authStore.role === "administrator" ? "Administrator" : authStore.role === "student" ? "Student" : "User",
);

const locationLabel = computed(() => (route.meta.title as string | undefined) ?? "Student portal");

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
  <div class="app-shell student-shell" :class="{ 'app-shell--collapsed': navigationStore.isSidebarCollapsed }">
    <aside class="app-shell__sidebar">
      <div class="brand-panel">
        <div class="brand-panel__mark" aria-hidden="true">
          <PhStudent weight="fill" />
        </div>
        <div class="brand-panel__copy">
          <p class="brand-panel__name">Pica Ponto</p>
          <p class="brand-panel__tagline">Student portal</p>
        </div>
      </div>

      <AppSidebarNav
        :entries="studentNavigationEntries"
        nav-label="Student workspace"
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
            <span class="topbar__workspace-context">Student workspace</span>
          </span>
        </div>

        <div class="topbar__actions">
          <AppThemeToggle />
          <RouterLink v-if="authStore.hasRole('administrator')" to="/admin/dashboard">
            <BaseButton label="Open admin" severity="secondary" />
          </RouterLink>
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
