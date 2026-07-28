import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { DeviceDetails, DeviceFilters } from "../types/devices";
import { deleteDevice, getDeviceById, listDevices, restartDevice, saveDevice, updateDeviceFirmware } from "../services/devices.service";

export const useDevicesStore = defineStore("devices", () => {
  const items = ref<DeviceDetails[]>([]);
  const selectedDevice = ref<DeviceDetails | null>(null);
  const filters = ref<DeviceFilters>({ query: "", status: "all", firmwareChannel: "all" });
  const loading = ref(false);
  const saving = ref(false);

  const offlineDevicesCount = computed(() => items.value.filter((device) => device.status === "offline").length);

  async function loadDevices() {
    loading.value = true;
    try {
      items.value = await listDevices(filters.value);
    } finally {
      loading.value = false;
    }
  }

  async function loadDevice(deviceId: string) {
    selectedDevice.value = await getDeviceById(deviceId);
  }

  async function persistDevice(values: Parameters<typeof saveDevice>[0], deviceId?: string) {
    saving.value = true;
    try {
      await saveDevice(values, deviceId);
      await loadDevices();
    } finally {
      saving.value = false;
    }
  }

  async function restartDeviceAction(deviceId: string) {
    await restartDevice(deviceId);
    await loadDevices();
  }

  async function updateFirmware(deviceId: string, firmwareVersion: string) {
    await updateDeviceFirmware(deviceId, firmwareVersion);
    await loadDevices();
  }

  async function removeDevice(deviceId: string) {
    await deleteDevice(deviceId);
    await loadDevices();
  }

  return {
    items,
    selectedDevice,
    filters,
    loading,
    saving,
    offlineDevicesCount,
    loadDevices,
    loadDevice,
    persistDevice,
    restartDeviceAction,
    updateFirmware,
    removeDevice,
  };
});
