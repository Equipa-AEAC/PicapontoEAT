<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Menu from "primevue/menu";
import Dialog from "primevue/dialog";
import { PhStudent } from "@phosphor-icons/vue";

import { BaseAvatar, BaseConfirmDialog } from "../../shared/components/base";
import { useAuthStore } from "../../modules/authentication";
import { studentNavigationItems } from "../router/studentNavigation";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const profileMenu = ref();
const showProfileDialog = ref(false);
const showLogoutConfirm = ref(false);
const showAboutDialog = ref(false);

const pageTitle = computed(() => (typeof route.meta.title === "string" ? route.meta.title : "Student portal"));
const pageSubtitle = computed(() =>
  typeof route.meta.subtitle === "string" ? route.meta.subtitle : "Track attendance, internship and profile data",
);
const userRoleLabel = computed(() => (authStore.role === "administrator" ? "Administrator" : authStore.role === "student" ? "Student" : "User"));

const profileMenuItems = [
  { label: "My Profile", icon: "pi pi-user", command: () => { showProfileDialog.value = true; } },
  { label: "Settings", icon: "pi pi-cog", command: () => router.push({ name: "student-settings" }) },
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
          <span class="sidebar-nav__text">
            <span class="sidebar-nav__label">{{ item.label }}</span>
            <span class="sidebar-nav__description">{{ item.description }}</span>
          </span>
        </RouterLink>
      </nav>
    </aside>

    <div class="app-shell__content">
      <header class="topbar">
        <div class="topbar__leading">
          <div>
            <p class="topbar__eyebrow">Student</p>
            <h2 class="topbar__title">{{ pageTitle }}</h2>
            <p class="topbar__subtitle">{{ pageSubtitle }}</p>
          </div>
        </div>

        <div class="topbar__actions">
          <Button class="topbar__profile-trigger" severity="secondary" outlined @click="profileMenu.toggle($event)">
            <span class="topbar__profile-trigger-inner">
              <BaseAvatar :label="authStore.currentUser?.fullName ?? 'U'" size="normal" />
              <span class="topbar__profile-copy">
                <span class="topbar__profile-name">{{ authStore.currentUser?.fullName ?? 'User' }}</span>
                <span class="topbar__profile-role">{{ userRoleLabel }}</span>
              </span>
            </span>
          </Button>
          <RouterLink to="/admin/dashboard">
            <Button label="Open admin" severity="secondary" outlined />
          </RouterLink>
          <Menu ref="profileMenu" :model="profileMenuItems" popup />
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
  </div>
</template>

<style scoped>
.student-shell .sidebar-card {
  display: none;
}
</style>
