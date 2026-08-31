<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { PhArrowClockwise, PhDeviceMobileSlash, PhSealCheck, PhWifiHigh } from "@phosphor-icons/vue";

import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseConfirmDialog from "../../../../components/base/BaseConfirmDialog.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseErrorState from "../../../../components/base/BaseErrorState.vue";
import BaseFilterPanel from "../../../../components/base/BaseFilterPanel.vue";
import BaseFormDialog from "../../../../components/base/BaseFormDialog.vue";
import BaseLoading from "../../../../components/base/BaseLoading.vue";
import BaseMetricCard from "../../../../components/base/BaseMetricCard.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseInputNumber from "../../../../components/base/BaseInputNumber.vue";
import BaseSelect from "../../../../components/base/BaseSelect.vue";
import BaseStatusPill from "../../../../components/base/BaseStatusPill.vue";
import BaseTextarea from "../../../../components/base/BaseTextarea.vue";
import BaseTextInput from "../../../../components/base/BaseTextInput.vue";
import { useDevicesStore } from "../../../../stores/devices";
import type { DeviceFormValues } from "../../../../types/devices";
import { formatTimestamp } from "../../../../shared/utils/date";

const devicesStore = useDevicesStore();

const formVisible = ref(false);
const editingDeviceId = ref<string | null>(null);
const removeConfirmVisible = ref(false);
const pendingRemoveId = ref<string | null>(null);

const form = reactive<DeviceFormValues>({
  name: "",
  location: "",
  description: "",
  firmwareChannel: "stable",
  heartbeatIntervalMinutes: 5,
  notes: "",
});

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Online", value: "online" },
  { label: "Offline", value: "offline" },
  { label: "Warning", value: "warning" },
  { label: "Maintenance", value: "maintenance" },
];

const firmwareOptions = [
  { label: "All channels", value: "all" },
  { label: "Stable", value: "stable" },
  { label: "Beta", value: "beta" },
  { label: "Edge", value: "edge" },
];

const firmwareChannelOptions = [
  { label: "Stable", value: "stable" },
  { label: "Beta", value: "beta" },
  { label: "Edge", value: "edge" },
];

const dialogTitle = computed(() => (editingDeviceId.value ? "Edit device" : "Add device"));

/**
 * The list is whatever the service returned.
 *
 * The page used to re-filter these rows by query, status and channel a second
 * time in the browser, over local refs that shadowed the store filters. That
 * meant the visible list moved as you typed while the store had not been asked
 * for anything, and Reset cleared the shadows without clearing the filters the
 * store had actually been given — the selects read "All" while the list stayed
 * narrowed. `listDevices` already applies all three.
 */
const visibleDevices = computed(() => devicesStore.items);

const onlineCount = computed(() => devicesStore.items.filter((device) => device.status === "online").length);
const warningCount = computed(() => devicesStore.items.filter((device) => device.status === "warning").length);
const offlineCount = computed(() => devicesStore.items.filter((device) => device.status === "offline").length);
const queueCount = computed(() => devicesStore.items.reduce((total, device) => total + device.queueSize, 0));

const hasActiveFilters = computed(
  () =>
    devicesStore.filters.query.trim().length > 0 ||
    devicesStore.filters.status !== "all" ||
    devicesStore.filters.firmwareChannel !== "all",
);

let searchTimer: ReturnType<typeof setTimeout> | undefined;

/** Typing filters the list directly — debounced so it is one request, not one per key. */
watch(
  () => devicesStore.filters.query,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void devicesStore.loadDevices(), 250);
  },
);

watch(
  () => [devicesStore.filters.status, devicesStore.filters.firmwareChannel],
  () => {
    void devicesStore.loadDevices();
  },
);

function clearFilters() {
  devicesStore.resetFilters();
  void devicesStore.loadDevices();
}

async function openDetails(deviceId: string) {
  await devicesStore.loadDevice(deviceId);
}

async function restartDevice(deviceId: string) {
  await devicesStore.restartDeviceAction(deviceId);
}

async function setStableChannel(deviceId: string) {
  await devicesStore.updateFirmware(deviceId, "stable");
}

function openCreateDialog() {
  editingDeviceId.value = null;
  form.name = "";
  form.location = "";
  form.description = "";
  form.firmwareChannel = "stable";
  form.heartbeatIntervalMinutes = 5;
  form.notes = "";
  formVisible.value = true;
}

function openEditDialog(deviceId: string) {
  const device = devicesStore.items.find((item) => item.id === deviceId);
  if (!device) return;
  editingDeviceId.value = device.id;
  form.name = device.name;
  form.location = device.location;
  form.description = device.description;
  form.firmwareChannel = device.firmwareChannel;
  form.heartbeatIntervalMinutes = device.heartbeatIntervalMinutes;
  form.notes = device.notes;
  formVisible.value = true;
}

async function submitForm() {
  await devicesStore.persistDevice({ ...form }, editingDeviceId.value ?? undefined);
  formVisible.value = false;
}

function requestRemove(deviceId: string) {
  pendingRemoveId.value = deviceId;
  removeConfirmVisible.value = true;
}

async function confirmRemove() {
  if (pendingRemoveId.value) {
    await devicesStore.removeDevice(pendingRemoveId.value);
  }
  pendingRemoveId.value = null;
  removeConfirmVisible.value = false;
}

onMounted(async () => {
  await devicesStore.loadDevices();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Devices"
      description="Monitor connected terminals, firmware versions and heartbeat status in one place."
    >
      <template #actions>
        <BaseButton label="Refresh status" severity="secondary" outlined @click="devicesStore.loadDevices()" />
        <BaseButton label="Add device" @click="openCreateDialog()" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="devicesStore.errorMessage"
      :message="devicesStore.errorMessage"
      @retry="devicesStore.loadDevices()"
    />

    <section class="metric-grid">
      <!--
        These count the rows in the current view, not the whole fleet: filtering
        to Offline necessarily makes "Online" read 0. The captions say so rather
        than claiming a fleet-wide number the filter has already excluded.
      -->
      <BaseMetricCard label="Online devices" :value="String(onlineCount)" caption="Reporting heartbeats, in the current view" :icon="PhWifiHigh" />
      <BaseMetricCard label="Warnings" :value="String(warningCount)" caption="Devices requiring attention, in the current view" :icon="PhSealCheck" :trend-label="warningCount > 0 ? 'Needs review' : 'All clear'" :trend-tone="warningCount > 0 ? 'negative' : 'positive'" />
      <BaseMetricCard label="Offline devices" :value="String(offlineCount)" caption="Terminals without a heartbeat, in the current view" :icon="PhDeviceMobileSlash" :trend-label="offlineCount > 0 ? 'Needs recovery' : 'All reporting'" :trend-tone="offlineCount > 0 ? 'negative' : 'positive'" />
      <BaseMetricCard label="Queue depth" :value="String(queueCount)" caption="Pending scans, in the current view" :icon="PhArrowClockwise" />
    </section>

    <BaseLoading v-if="devicesStore.loading" />

    <BaseFilterPanel title="Search and filters" description="Filters apply as you type — no Apply step.">
      <div class="filter-strip">
        <BaseTextInput v-model="devicesStore.filters.query" placeholder="Search devices, IP address or location" />
        <BaseSelect v-model="devicesStore.filters.status" :options="statusOptions" />
        <BaseSelect v-model="devicesStore.filters.firmwareChannel" :options="firmwareOptions" />
        <BaseButton label="Clear filters" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>
    </BaseFilterPanel>

    <section class="dashboard-grid">
      <BaseCard title="Fleet overview" description="Each row exposes the terminal state, queue pressure and quick maintenance actions.">
        <BaseEmptyState
          v-if="visibleDevices.length === 0"
          title="No devices found"
          :description="
            hasActiveFilters
              ? 'No device matches the current filters.'
              : 'No terminals are registered yet. Use Add device to register one.'
          "
          :action-label="hasActiveFilters ? 'Clear filters' : undefined"
          @action="clearFilters"
        />
        <article v-for="device in visibleDevices" :key="device.id" class="list-row">
          <div>
            <strong>{{ device.name }}</strong>
            <p>{{ device.location }} • {{ device.ipAddress }} • {{ device.firmwareVersion }} • Queue {{ device.queueSize }}</p>
          </div>
          <div class="inline-actions">
            <BaseStatusPill :label="device.status" :tone="device.status === 'online' ? 'success' : device.status === 'offline' ? 'danger' : 'warning'" :value="device.lastHeartbeatAt" />
            <BaseButton label="Details" severity="secondary" text @click="openDetails(device.id)" />
            <BaseButton label="Edit" severity="secondary" text @click="openEditDialog(device.id)" />
            <BaseButton label="Restart" severity="secondary" text @click="restartDevice(device.id)" />
            <BaseButton v-if="device.firmwareChannel !== 'stable'" label="Set stable channel" severity="secondary" text @click="setStableChannel(device.id)" />
            <BaseButton label="Remove" severity="danger" text @click="requestRemove(device.id)" />
          </div>
        </article>
      </BaseCard>

      <BaseCard v-if="devicesStore.selectedDevice" title="Device details" description="Selected terminal profile and maintenance notes.">
        <div class="module-summary">
          <BaseStatusPill :label="devicesStore.selectedDevice.status" :tone="devicesStore.selectedDevice.status === 'online' ? 'success' : devicesStore.selectedDevice.status === 'offline' ? 'danger' : 'warning'" />
          <p><strong>Location:</strong> {{ devicesStore.selectedDevice.location }}</p>
          <p><strong>Firmware:</strong> {{ devicesStore.selectedDevice.firmwareVersion }} ({{ devicesStore.selectedDevice.firmwareChannel }})</p>
          <p><strong>Heartbeat:</strong> {{ formatTimestamp(devicesStore.selectedDevice.lastHeartbeatAt) }}</p>
          <p><strong>Notes:</strong> {{ devicesStore.selectedDevice.notes }}</p>
        </div>
      </BaseCard>
    </section>

    <BaseFormDialog
      :visible="formVisible"
      :title="dialogTitle"
      subtitle="Register or update a terminal's identity and firmware channel."
      confirm-label="Save device"
      :loading="devicesStore.saving"
      @update:visible="formVisible = $event"
      @confirm="submitForm"
      @cancel="formVisible = false"
    >
      <div class="settings-grid">
        <label>
          <span>Name *</span>
          <BaseTextInput v-model="form.name" placeholder="Entrance terminal" />
        </label>
        <label>
          <span>Location *</span>
          <BaseTextInput v-model="form.location" placeholder="Main entrance" />
        </label>
        <label>
          <span>Firmware channel</span>
          <BaseSelect v-model="form.firmwareChannel" :options="firmwareChannelOptions" />
        </label>
        <label>
          <span>Heartbeat interval (minutes)</span>
          <BaseInputNumber v-model="form.heartbeatIntervalMinutes" :min="1" />
        </label>
        <label class="settings-grid__wide">
          <span>Description</span>
          <BaseTextarea v-model="form.description" rows="2" auto-resize />
        </label>
        <label class="settings-grid__wide">
          <span>Notes</span>
          <BaseTextarea v-model="form.notes" rows="2" auto-resize />
        </label>
      </div>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="removeConfirmVisible"
      title="Remove device"
      message="This terminal will be removed from the fleet and stop accepting scans."
      severity="danger"
      @update:visible="removeConfirmVisible = $event"
      @confirm="confirmRemove"
      @cancel="removeConfirmVisible = false"
    />
  </section>
</template>
