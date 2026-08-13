<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { PhArrowClockwise, PhDeviceMobileSlash, PhSealCheck, PhWifiHigh } from "@phosphor-icons/vue";

import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseConfirmDialog from "../../../../components/base/BaseConfirmDialog.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
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

const devicesStore = useDevicesStore();
const selectedFirmware = ref("all");
const selectedStatus = ref("all");

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

const visibleDevices = computed(() => {
  return devicesStore.items.filter((device) => {
    const matchesQuery = devicesStore.filters.query.trim().length === 0 || [device.name, device.location, device.ipAddress, device.firmwareVersion].some((value) => value.toLowerCase().includes(devicesStore.filters.query.toLowerCase()));
    const matchesStatus = selectedStatus.value === "all" || device.status === selectedStatus.value;
    const matchesFirmware = selectedFirmware.value === "all" || device.firmwareChannel === selectedFirmware.value;
    return matchesQuery && matchesStatus && matchesFirmware;
  });
});

const onlineCount = computed(() => devicesStore.items.filter((device) => device.status === "online").length);
const warningCount = computed(() => devicesStore.items.filter((device) => device.status === "warning").length);
const offlineCount = computed(() => devicesStore.items.filter((device) => device.status === "offline").length);
const queueCount = computed(() => devicesStore.items.reduce((total, device) => total + device.queueSize, 0));

function resetFilters() {
  devicesStore.filters.query = "";
  selectedStatus.value = "all";
  selectedFirmware.value = "all";
}

async function applyFilters() {
  devicesStore.filters.status = selectedStatus.value as "all" | "online" | "offline" | "warning" | "maintenance";
  devicesStore.filters.firmwareChannel = selectedFirmware.value as "all" | "stable" | "beta" | "edge";
  await devicesStore.loadDevices();
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

    <section class="metric-grid">
      <BaseMetricCard label="Online devices" :value="String(onlineCount)" caption="Currently reporting heartbeats" :icon="PhWifiHigh" trend-label="Healthy" trend-tone="positive" />
      <BaseMetricCard label="Warnings" :value="String(warningCount)" caption="Devices requiring attention" :icon="PhSealCheck" trend-label="Check queue" trend-tone="neutral" />
      <BaseMetricCard label="Offline devices" :value="String(offlineCount)" caption="Terminals without a heartbeat" :icon="PhDeviceMobileSlash" trend-label="Needs recovery" trend-tone="negative" />
      <BaseMetricCard label="Queue depth" :value="String(queueCount)" caption="Pending scans across the fleet" :icon="PhArrowClockwise" trend-label="Live load" trend-tone="positive" />
    </section>

    <BaseLoading v-if="devicesStore.loading" />

    <BaseCard title="Filters" description="Search and segment devices by operational state.">
      <div class="filter-strip">
        <BaseTextInput v-model="devicesStore.filters.query" placeholder="Search devices, IP address or location" />
        <BaseSelect v-model="selectedStatus" :options="statusOptions" />
        <BaseSelect v-model="selectedFirmware" :options="firmwareOptions" />
        <BaseButton label="Apply filters" @click="applyFilters" />
        <BaseButton label="Reset" severity="secondary" outlined @click="resetFilters" />
      </div>
    </BaseCard>

    <section class="dashboard-grid">
      <BaseCard title="Fleet overview" description="Each row exposes the terminal state, queue pressure and quick maintenance actions.">
        <BaseEmptyState v-if="visibleDevices.length === 0" title="No devices found" description="No devices match the current filters." />
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
          <p><strong>Heartbeat:</strong> {{ devicesStore.selectedDevice.lastHeartbeatAt }}</p>
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
