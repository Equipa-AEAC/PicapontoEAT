<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { PhArrowClockwise, PhDeviceMobileSlash, PhSealCheck, PhWifiHigh } from "@phosphor-icons/vue";

import BaseEmptyState from "../components/base/BaseEmptyState.vue";
import BaseLoading from "../components/base/BaseLoading.vue";
import BaseCard from "../components/base/BaseCard.vue";
import BaseMetricCard from "../components/base/BaseMetricCard.vue";
import BasePageHeader from "../components/base/BasePageHeader.vue";
import BaseStatusPill from "../components/base/BaseStatusPill.vue";
import { useDevicesStore } from "../stores/devices";

const devicesStore = useDevicesStore();
const selectedFirmware = ref("all");
const selectedStatus = ref("all");

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

async function deactivateQueue(deviceId: string) {
  await devicesStore.updateFirmware(deviceId, "stable");
}

async function removeDevice(deviceId: string) {
  await devicesStore.removeDevice(deviceId);
}

onMounted(async () => {
  await devicesStore.loadDevices();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      eyebrow="Terminal monitoring"
      title="Devices"
      description="Monitor connected terminals, firmware versions and heartbeat status in one place."
    >
      <template #actions>
        <Button label="Refresh status" severity="secondary" outlined @click="devicesStore.loadDevices()" />
        <Button label="Add device" />
      </template>
    </BasePageHeader>

    <div class="page-breadcrumbs">
      <span>Admin Workspace</span>
      <span>/</span>
      <span>Devices</span>
    </div>

    <section class="metric-grid">
      <BaseMetricCard label="Online devices" :value="String(onlineCount)" caption="Currently reporting heartbeats" :icon="PhWifiHigh" trend-label="Healthy" trend-tone="positive" />
      <BaseMetricCard label="Warnings" :value="String(warningCount)" caption="Devices requiring attention" :icon="PhSealCheck" trend-label="Check queue" trend-tone="neutral" />
      <BaseMetricCard label="Offline devices" :value="String(offlineCount)" caption="Terminals without a heartbeat" :icon="PhDeviceMobileSlash" trend-label="Needs recovery" trend-tone="negative" />
      <BaseMetricCard label="Queue depth" :value="String(queueCount)" caption="Pending scans across the fleet" :icon="PhArrowClockwise" trend-label="Live load" trend-tone="positive" />
    </section>

    <BaseLoading v-if="devicesStore.loading" />

    <BaseCard title="Filters" description="Search and segment devices by operational state.">
      <div class="filter-strip">
        <InputText v-model="devicesStore.filters.query" placeholder="Search devices, IP address or location" />
        <Select v-model="selectedStatus" :options="statusOptions" optionLabel="label" optionValue="value" />
        <Select v-model="selectedFirmware" :options="firmwareOptions" optionLabel="label" optionValue="value" />
        <Button label="Apply filters" @click="applyFilters" />
        <Button label="Reset" severity="secondary" outlined @click="resetFilters" />
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
            <Button label="Details" severity="secondary" text @click="openDetails(device.id)" />
            <Button label="Restart" severity="secondary" text @click="restartDevice(device.id)" />
            <Button label="Stable" severity="secondary" text @click="deactivateQueue(device.id)" />
            <Button label="Remove" severity="danger" text @click="removeDevice(device.id)" />
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
  </section>
</template>