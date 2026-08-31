import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { DeviceDetails, DeviceFilters } from "../types/devices";
import { deleteDevice, getDeviceById, listDevices, restartDevice, saveDevice, updateDeviceFirmware } from "../services/devices.service";
import { describeError } from "../utils/errors";

export const useDevicesStore = defineStore("devices", () => {
  const items = ref<DeviceDetails[]>([]);
  const selectedDevice = ref<DeviceDetails | null>(null);
  const filters = ref<DeviceFilters>({ query: "", status: "all", firmwareChannel: "all" });
  const loading = ref(false);
  const saving = ref(false);
  /** A failed request must never be shown as an empty result. */
  const errorMessage = ref<string | null>(null);

  const offlineDevicesCount = computed(() => items.value.filter((device) => device.status === "offline").length);

  async function loadDevices() {
    loading.value = true;
    errorMessage.value = null;
    try {
      items.value = await listDevices(filters.value);
    } catch (error) {
      errorMessage.value = describeError(error, "Devices could not be loaded.");
    } finally {
      loading.value = false;
    }
  }

  /** Mirrors `useMembersStore.resetFilters` so every list page clears the same way. */
  function resetFilters() {
    filters.value = { query: "", status: "all", firmwareChannel: "all" };
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
    errorMessage,
    offlineDevicesCount,
    resetFilters,
    loadDevices,
    loadDevice,
    persistDevice,
    restartDeviceAction,
    updateFirmware,
    removeDevice,
  };
});
