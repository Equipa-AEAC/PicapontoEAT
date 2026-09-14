<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { PhGearSix, PhGraduationCap, PhInfo, PhList, PhSignOut, PhUserCircle } from "@phosphor-icons/vue";

import { BaseAvatar, BaseButton, BaseConfirmDialog, BaseDialog, BaseMenu } from "../../shared/components/base";
import type { BaseMenuItem } from "../../shared/components/base";
import AppSidebarNav from "../../components/navigation/AppSidebarNav.vue";
import AppLanguageToggle from "../../components/navigation/AppLanguageToggle.vue";
import AppThemeToggle from "../../components/navigation/AppThemeToggle.vue";
import { t } from "../../i18n";
import { adminNavigationEntries } from "../router/adminNavigation";
import {
  useAttendanceCorrectionsStore,
  useCertificatesStore,
  useInternshipReportsStore,
  useMomentsStore,
  useNavigationStore,
  useProfileChangeRequestsStore,
} from "../../shared/stores";
import { useAuthStore } from "../../modules/authentication";

const navigationStore = useNavigationStore();
const correctionsStore = useAttendanceCorrectionsStore();
const certificatesStore = useCertificatesStore();
const profileRequestsStore = useProfileChangeRequestsStore();
const reportsStore = useInternshipReportsStore();
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
  /*
   * Members carries the profile-change queue because that is where those
   * requests are reviewed — a badge has to sit on the page that resolves it,
   * not on the page the record happens to belong to.
   */
  members: profileRequestsStore.pendingCount,
  attendance: correctionsStore.pendingCount,
  reports: reportsStore.awaitingReviewCount,
  certificates: certificatesStore.pendingCount,
  "team-moments": momentsStore.summary?.activeMoments ?? 0,
}));

/** Refresh on every navigation: a request may have been raised elsewhere. */
async function refreshBadges() {
  await Promise.all([
    correctionsStore.refreshPendingCount(),
    profileRequestsStore.refreshPendingCount(),
    reportsStore.refreshAwaitingReviewCount(),
    certificatesStore.refreshPendingCount(),
    momentsStore.loadGallery(),
  ]);
}

onMounted(refreshBadges);
watch(() => route.path, refreshBadges);

const userRoleLabel = computed(() =>
  authStore.role === "administrator"
    ? t("shell.role.administrator")
    : authStore.role === "student"
      ? t("shell.role.student")
      : t("shell.role.user"),
);

/**
 * The topbar states where you are, never what the page is called — the page header
 * owns the title, so repeating it here would be a second title on every screen.
 */
const locationLabel = computed(() => {
  const key = route.meta.title as string | undefined;

  return key ? t(key) : t("shell.workspace.admin");
});

/*
 * Computed, not a constant: a menu built once at module scope would keep whatever
 * language happened to be active when the layout was first imported.
 */
const profileMenuItems = computed<BaseMenuItem[]>(() => [
  { label: t("shell.profile.myProfile"), icon: PhUserCircle, command: () => { showProfileDialog.value = true; } },
  { label: t("shell.profile.settings"), icon: PhGearSix, command: () => router.push({ name: "settings" }) },
  { label: t("shell.profile.about"), icon: PhInfo, command: () => { showAboutDialog.value = true; } },
  { separator: true },
  { label: t("shell.profile.logout"), icon: PhSignOut, command: () => { showLogoutConfirm.value = true; } },
]);

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
          <p class="brand-panel__name">{{ $t("shell.brand.name") }}</p>
          <p class="brand-panel__tagline">{{ $t("shell.brand.admin") }}</p>
        </div>
      </div>

      <AppSidebarNav
        :entries="adminNavigationEntries"
        :nav-label="$t('shell.workspace.adminNav')"
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
            :aria-label="$t('shell.topbar.toggleNavigation')"
            @click="navigationStore.toggleSidebar"
          >
            <PhList weight="regular" />
          </button>
          <span class="topbar__workspace">
            <span class="topbar__workspace-name">{{ locationLabel }}</span>
            <span class="topbar__workspace-context">{{ $t("shell.workspace.admin") }}</span>
          </span>
        </div>

        <div class="topbar__actions">
          <AppLanguageToggle />
          <AppThemeToggle />
          <BaseButton class="topbar__profile-trigger" severity="secondary" @click="profileMenu.toggle($event)">
            <span class="topbar__profile-trigger-inner">
              <BaseAvatar :label="authStore.currentUser?.fullName ?? 'U'" size="small" />
              <span class="topbar__profile-copy">
                <span class="topbar__profile-name">
                  {{ authStore.currentUser?.fullName ?? $t("shell.profile.fallbackName") }}
                </span>
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
      :title="$t('shell.logout.title')"
      :message="$t('shell.logout.message')"
      :confirm-label="$t('shell.logout.confirm')"
      :cancel-label="$t('common.actions.cancel')"
      severity="primary"
      :loading="authStore.loading"
      @update:visible="showLogoutConfirm = $event"
      @confirm="confirmLogout"
      @cancel="showLogoutConfirm = false"
    />

    <BaseDialog :visible="showAboutDialog" :header="$t('shell.about.title')" class="app-about-dialog" @update:visible="showAboutDialog = $event">
      <p>{{ $t("shell.about.body") }}</p>
      <p>{{ $t("shell.about.version") }}</p>
    </BaseDialog>

    <BaseDialog :visible="showProfileDialog" :header="$t('shell.profile.myProfile')" class="app-profile-dialog" @update:visible="showProfileDialog = $event">
      <div class="app-profile-dialog__body">
        <BaseAvatar :label="authStore.currentUser?.fullName ?? 'U'" size="xlarge" />
        <div>
          <p>{{ authStore.currentUser?.fullName ?? $t("shell.profile.fallbackName") }}</p>
          <p>{{ authStore.currentUser?.email ?? $t("shell.profile.noEmail") }}</p>
          <p>{{ userRoleLabel }}</p>
        </div>
      </div>
    </BaseDialog>
  </div>
</template>
