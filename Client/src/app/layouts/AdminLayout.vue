<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Menu from "primevue/menu";
import Dialog from "primevue/dialog";
import { PhList, PhSparkle } from "@phosphor-icons/vue";

import { BaseAvatar, BaseCard, BaseConfirmDialog, BaseStatusPill } from "../../shared/components/base";
import { adminNavigationItems } from "../router/adminNavigation";
import { useNavigationStore } from "../../shared/stores";
import { useAuthStore } from "../../modules/authentication";

const navigationStore = useNavigationStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const profileMenu = ref();
const showProfileDialog = ref(false);
const showLogoutConfirm = ref(false);
const showAboutDialog = ref(false);

const pageTitle = computed(() => (typeof route.meta.title === "string" ? route.meta.title : "Pica Ponto"));
const pageSubtitle = computed(() =>
  typeof route.meta.subtitle === "string" ? route.meta.subtitle : "Desktop attendance operations workspace",
);
const userRoleLabel = computed(() => (authStore.role === "administrator" ? "Administrator" : authStore.role === "student" ? "Student" : "User"));

const profileMenuItems = [
  { label: "My Profile", icon: "pi pi-user", command: () => { showProfileDialog.value = true; } },
  { label: "Settings", icon: "pi pi-cog", command: () => router.push({ name: "settings" }) },
  { label: "About", icon: "pi pi-info-circle", command: () => { showAboutDialog.value = true; } },
  { separator: true },
  { label: "Logout", icon: "pi pi-sign-out", command: () => { showLogoutConfirm.value = true; } },
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
          <span class="sidebar-nav__text">
            <span class="sidebar-nav__label">{{ item.label }}</span>
            <span class="sidebar-nav__description">{{ item.description }}</span>
          </span>
        </RouterLink>
      </nav>

      <BaseCard class="sidebar-card" title="Workspace status" description="Desktop shell is ready for API integration.">
        <template #header>
          <BaseStatusPill label="Ready" tone="success" />
        </template>

        <div class="sidebar-card__grid">
          <div>
            <p class="sidebar-card__label">Frontend</p>
            <p class="sidebar-card__value">Vue 3 + TypeScript</p>
          </div>
          <div>
            <p class="sidebar-card__label">Transport</p>
            <p class="sidebar-card__value">REST services</p>
          </div>
        </div>
      </BaseCard>
    </aside>

    <div class="app-shell__content">
      <header class="topbar">
        <div class="topbar__leading">
          <button class="topbar__toggle" type="button" @click="navigationStore.toggleSidebar">
            <PhList weight="bold" />
          </button>

          <div>
            <p class="topbar__eyebrow">Pica Ponto</p>
            <h2 class="topbar__title">{{ pageTitle }}</h2>
            <p class="topbar__subtitle">{{ pageSubtitle }}</p>
          </div>
        </div>

        <div class="topbar__actions">
          <Button label="New scan" severity="secondary" outlined />
          <Button label="Generate report" />
          <Button class="topbar__profile-trigger" severity="secondary" outlined @click="profileMenu.toggle($event)">
            <span class="topbar__profile-trigger-inner">
              <BaseAvatar :label="authStore.currentUser?.fullName ?? 'U'" size="normal" />
              <span class="topbar__profile-copy">
                <span class="topbar__profile-name">{{ authStore.currentUser?.fullName ?? 'User' }}</span>
                <span class="topbar__profile-role">{{ userRoleLabel }}</span>
              </span>
            </span>
          </Button>
          <Menu ref="profileMenu" :model="profileMenuItems" popup />
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

    <Dialog v-model:visible="showAboutDialog" modal header="About Pica Ponto" class="app-about-dialog">
      <p>This workspace is the desktop attendance and member management application.</p>
      <p>Version: development build</p>
    </Dialog>

    <Dialog v-model:visible="showProfileDialog" modal header="My Profile" class="app-profile-dialog">
      <div class="app-profile-dialog__body">
        <BaseAvatar :label="authStore.currentUser?.fullName ?? 'U'" size="xlarge" />
        <div>
          <p>{{ authStore.currentUser?.fullName ?? 'User' }}</p>
          <p>{{ authStore.currentUser?.email ?? 'No email available' }}</p>
          <p>{{ userRoleLabel }}</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>
