<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { PhGearSix, PhInfo, PhList, PhSignOut, PhStudent, PhUserCircle } from "@phosphor-icons/vue";

import { BaseAvatar, BaseButton, BaseConfirmDialog, BaseDialog, BaseMenu } from "../../shared/components/base";
import type { BaseMenuItem } from "../../shared/components/base";
import AppSidebarNav from "../../components/navigation/AppSidebarNav.vue";
import AppLanguageToggle from "../../components/navigation/AppLanguageToggle.vue";
import AppThemeToggle from "../../components/navigation/AppThemeToggle.vue";
import { t } from "../../i18n";
import { useAuthStore } from "../../modules/authentication";
import {
  useAnnouncementsStore,
  useInternshipsStore,
  useMomentsStore,
  useNavigationStore,
  useStudentPreferencesStore,
} from "../../shared/stores";
import { applySidebarOrder } from "../../shared/types";
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
const preferencesStore = useStudentPreferencesStore();

/**
 * The sidebar in the order this student chose.
 *
 * `applySidebarOrder` treats `studentNavigationEntries` as the authority on what
 * exists and the preference as an opinion about sequence only, so a stored order
 * can reorder the navigation but can never remove a page from it — including
 * pages added in a later release, which simply appear at the end.
 */
const navigationEntries = computed(() =>
  applySidebarOrder(studentNavigationEntries, preferencesStore.sidebarOrder),
);
const profileMenu = ref();
const showProfileDialog = ref(false);
const showLogoutConfirm = ref(false);
const showAboutDialog = ref(false);

const userRoleLabel = computed(() =>
  authStore.role === "administrator"
    ? t("shell.role.administrator")
    : authStore.role === "student"
      ? t("shell.role.student")
      : t("shell.role.user"),
);

const locationLabel = computed(() => {
  const key = route.meta.title as string | undefined;

  return key ? t(key) : t("shell.brand.student");
});

/*
 * Computed, not a constant: a menu built once at module scope would keep whatever
 * language happened to be active when the layout was first imported.
 */
const profileMenuItems = computed<BaseMenuItem[]>(() => [
  { label: t("shell.profile.myProfile"), icon: PhUserCircle, command: () => { showProfileDialog.value = true; } },
  { label: t("shell.profile.settings"), icon: PhGearSix, command: () => router.push({ name: "student-settings" }) },
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
  <div class="app-shell student-shell" :class="{ 'app-shell--collapsed': navigationStore.isSidebarCollapsed }">
    <aside class="app-shell__sidebar">
      <div class="brand-panel">
        <div class="brand-panel__mark" aria-hidden="true">
          <PhStudent weight="fill" />
        </div>
        <div class="brand-panel__copy">
          <p class="brand-panel__name">{{ $t("shell.brand.name") }}</p>
          <p class="brand-panel__tagline">{{ $t("shell.brand.student") }}</p>
        </div>
      </div>

      <AppSidebarNav
        :entries="navigationEntries"
        :nav-label="$t('shell.workspace.studentNav')"
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
            <span class="topbar__workspace-context">{{ $t("shell.workspace.student") }}</span>
          </span>
        </div>

        <div class="topbar__actions">
          <AppLanguageToggle />
          <AppThemeToggle />
          <RouterLink v-if="authStore.hasRole('administrator')" to="/admin/dashboard">
            <BaseButton :label="$t('shell.workspace.openAdmin')" severity="secondary" />
          </RouterLink>
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
  </div>
</template>
