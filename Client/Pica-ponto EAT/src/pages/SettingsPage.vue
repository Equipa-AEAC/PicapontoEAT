<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";

import BaseCard from "../components/base/BaseCard.vue";
import BaseEmptyState from "../components/base/BaseEmptyState.vue";
import BaseLoading from "../components/base/BaseLoading.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseStatusPill from "../components/base/BaseStatusPill.vue";
import { useSettingsStore } from "../stores/settings";
import type { ApplicationSettings } from "../types/settings";

const settingsStore = useSettingsStore();
const loadError = ref<string | null>(null);

const themeOptions = [
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "System", value: "system" },
];

const languageOptions = [
  { label: "Portuguese (Brazil)", value: "pt-BR" },
  { label: "English (US)", value: "en-US" },
  { label: "Spanish (Latin America)", value: "es-419" },
];

const timezoneOptions = [
  { label: "America/Sao_Paulo", value: "America/Sao_Paulo" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "Europe/Lisbon", value: "Europe/Lisbon" },
];

function createDefaultSettings(): ApplicationSettings {
  return {
    schoolName: "Pica Ponto EAT",
    logoUrl: "",
    theme: "dark",
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
    attendance: {
      duplicateScanTimeoutMinutes: 5,
      workingDayStart: "08:00",
      workingDayEnd: "18:00",
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
    },
    devices: {
      otaEnabled: true,
      apiUrl: "https://api.local/pica-ponto",
      backupEnabled: true,
      backupPath: "C:/backups/pica-ponto",
    },
    notifications: {
      emailEnabled: true,
      desktopEnabled: true,
      recipients: "admin@school.local",
    },
    logRetentionDays: 180,
  };
}

const form = reactive<ApplicationSettings>(createDefaultSettings());

function syncForm(nextValue: ApplicationSettings | null) {
  const source = nextValue ?? createDefaultSettings();
  form.schoolName = source.schoolName;
  form.logoUrl = source.logoUrl;
  form.theme = source.theme;
  form.language = source.language;
  form.timezone = source.timezone;
  form.attendance.duplicateScanTimeoutMinutes = source.attendance.duplicateScanTimeoutMinutes;
  form.attendance.workingDayStart = source.attendance.workingDayStart;
  form.attendance.workingDayEnd = source.attendance.workingDayEnd;
  form.attendance.entryToleranceMinutes = source.attendance.entryToleranceMinutes;
  form.attendance.exitToleranceMinutes = source.attendance.exitToleranceMinutes;
  form.devices.otaEnabled = source.devices.otaEnabled;
  form.devices.apiUrl = source.devices.apiUrl;
  form.devices.backupEnabled = source.devices.backupEnabled;
  form.devices.backupPath = source.devices.backupPath;
  form.notifications.emailEnabled = source.notifications.emailEnabled;
  form.notifications.desktopEnabled = source.notifications.desktopEnabled;
  form.notifications.recipients = source.notifications.recipients;
  form.logRetentionDays = source.logRetentionDays;
}

async function saveSettings() {
  await settingsStore.persistSettings({
    schoolName: form.schoolName,
    logoUrl: form.logoUrl,
    theme: form.theme,
    language: form.language,
    timezone: form.timezone,
    attendance: {
      duplicateScanTimeoutMinutes: form.attendance.duplicateScanTimeoutMinutes,
      workingDayStart: form.attendance.workingDayStart,
      workingDayEnd: form.attendance.workingDayEnd,
      entryToleranceMinutes: form.attendance.entryToleranceMinutes,
      exitToleranceMinutes: form.attendance.exitToleranceMinutes,
    },
    devices: {
      otaEnabled: form.devices.otaEnabled,
      apiUrl: form.devices.apiUrl,
      backupEnabled: form.devices.backupEnabled,
      backupPath: form.devices.backupPath,
    },
    notifications: {
      emailEnabled: form.notifications.emailEnabled,
      desktopEnabled: form.notifications.desktopEnabled,
      recipients: form.notifications.recipients,
    },
    logRetentionDays: form.logRetentionDays,
  });
}

function resetSettings() {
  syncForm(settingsStore.value);
}

async function loadSettings() {
  loadError.value = null;

  try {
    await settingsStore.loadSettings();
    syncForm(settingsStore.value);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "Unable to load settings.";
  }
}

onMounted(async () => {
  await loadSettings();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Configuration"
      title="Settings"
      description="Configure integrations, access controls and local desktop behavior."
    >
      <template #actions>
        <Button label="Refresh" severity="secondary" outlined :loading="settingsStore.loading" @click="loadSettings" />
        <Button label="Reset" severity="secondary" outlined :disabled="settingsStore.loading || settingsStore.saving" @click="resetSettings" />
        <Button label="Save changes" :loading="settingsStore.saving" :disabled="settingsStore.loading" @click="saveSettings" />
      </template>
    </BasePageHeader>

    <div class="page-breadcrumbs">
      <span>Admin Workspace</span>
      <span>/</span>
      <span>Settings</span>
    </div>

    <BaseLoading v-if="settingsStore.loading" />

    <BaseEmptyState
      v-else-if="loadError"
      title="Settings unavailable"
      :description="loadError"
      action-label="Retry"
      @action="loadSettings()"
    />

    <template v-else>
      <section class="metric-grid">
      <BaseCard title="Configuration state" description="Current persistence status and workspace context.">
        <div class="module-summary">
          <BaseStatusPill :label="settingsStore.loading ? 'Loading' : settingsStore.saving ? 'Saving' : 'Ready'" :tone="settingsStore.loading || settingsStore.saving ? 'warning' : 'success'" />
          <p>{{ settingsStore.value?.schoolName ?? form.schoolName }} is using the {{ form.theme }} theme and {{ form.language }} locale.</p>
        </div>
      </BaseCard>

      <BaseCard title="Retention and notifications" description="A compact view of critical controls.">
        <div class="module-summary">
          <BaseStatusPill :label="`${form.logRetentionDays} days retained`" tone="info" />
          <p>Email alerts are {{ form.notifications.emailEnabled ? 'enabled' : 'disabled' }}, desktop alerts are {{ form.notifications.desktopEnabled ? 'enabled' : 'disabled' }}.</p>
        </div>
      </BaseCard>
      </section>

      <section class="dashboard-grid">
      <BaseCard title="School identity" description="Branding and localization for the desktop shell.">
        <div class="settings-grid">
          <label>
            <span>School name</span>
            <InputText v-model="form.schoolName" />
          </label>
          <label>
            <span>Logo URL</span>
            <InputText v-model="form.logoUrl" placeholder="https://..." />
          </label>
          <label>
            <span>Theme</span>
            <Select v-model="form.theme" :options="themeOptions" optionLabel="label" optionValue="value" />
          </label>
          <label>
            <span>Language</span>
            <Select v-model="form.language" :options="languageOptions" optionLabel="label" optionValue="value" />
          </label>
          <label>
            <span>Timezone</span>
            <Select v-model="form.timezone" :options="timezoneOptions" optionLabel="label" optionValue="value" />
          </label>
          <label>
            <span>Log retention days</span>
            <InputNumber v-model="form.logRetentionDays" :min="30" :max="3650" />
          </label>
        </div>
      </BaseCard>

      <BaseCard title="Attendance rules" description="Validation windows and working day defaults.">
        <div class="settings-grid">
          <label>
            <span>Duplicate scan timeout</span>
            <InputNumber v-model="form.attendance.duplicateScanTimeoutMinutes" :min="1" :max="60" />
          </label>
          <label>
            <span>Working day start</span>
            <InputText v-model="form.attendance.workingDayStart" placeholder="08:00" />
          </label>
          <label>
            <span>Working day end</span>
            <InputText v-model="form.attendance.workingDayEnd" placeholder="18:00" />
          </label>
          <label>
            <span>Entry tolerance minutes</span>
            <InputNumber v-model="form.attendance.entryToleranceMinutes" :min="0" :max="120" />
          </label>
          <label>
            <span>Exit tolerance minutes</span>
            <InputNumber v-model="form.attendance.exitToleranceMinutes" :min="0" :max="120" />
          </label>
        </div>
      </BaseCard>

      <BaseCard title="Device integration" description="Tauri, REST and backup configuration.">
        <div class="settings-grid">
          <label>
            <span>OTA enabled</span>
            <ToggleSwitch v-model="form.devices.otaEnabled" />
          </label>
          <label>
            <span>API URL</span>
            <InputText v-model="form.devices.apiUrl" />
          </label>
          <label>
            <span>Backup enabled</span>
            <ToggleSwitch v-model="form.devices.backupEnabled" />
          </label>
          <label>
            <span>Backup path</span>
            <InputText v-model="form.devices.backupPath" />
          </label>
        </div>
      </BaseCard>

      <BaseCard title="Notifications" description="Delivery targets for alerts and desktop reminders.">
        <div class="settings-grid">
          <label>
            <span>Email notifications</span>
            <ToggleSwitch v-model="form.notifications.emailEnabled" />
          </label>
          <label>
            <span>Desktop notifications</span>
            <ToggleSwitch v-model="form.notifications.desktopEnabled" />
          </label>
          <label>
            <span>Recipients</span>
            <InputText v-model="form.notifications.recipients" placeholder="admin@school.local" />
          </label>
        </div>
      </BaseCard>
      </section>
    </template>
  </section>
</template>