import type { DeviceDetails, DeviceFilters, DeviceFormValues } from "../types/devices";
import { validateDevice } from "../types/devices";

import { appendAuditLog } from "./audit.service";
import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { t } from "../i18n";

export async function listDevices(filters: Partial<DeviceFilters> = {}): Promise<DeviceDetails[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    return cloneRecord(
      mockDatabase.devices.filter((device) => {
        const matchesQuery =
          query.length === 0 || [device.name, device.location, device.firmwareVersion, device.ipAddress].join(" ").toLowerCase().includes(query);
        const matchesStatus = !filters.status || filters.status === "all" || device.status === filters.status;
        const matchesChannel = !filters.firmwareChannel || filters.firmwareChannel === "all" || device.firmwareChannel === filters.firmwareChannel;

        return matchesQuery && matchesStatus && matchesChannel;
      }),
    );
  });
}

export async function getDeviceById(deviceId: string): Promise<DeviceDetails | null> {
  return mockRequest(() => cloneRecord(mockDatabase.devices.find((device) => device.id === deviceId) ?? null));
}

export async function saveDevice(values: DeviceFormValues, deviceId?: string): Promise<DeviceDetails> {
  return mockRequest(() => {
    const problem = validateDevice(values);

    if (problem) {
      throw new Error(problem);
    }

    const ipAddress = values.ipAddress.trim();

    const clash = mockDatabase.devices.find(
      (device) => device.id !== deviceId && device.ipAddress === ipAddress,
    );

    if (clash) {
      throw new Error(t("errors.ipAlreadyUsed", { name: clash.name, ip: ipAddress }));
    }

    if (deviceId) {
      const currentDevice = mockDatabase.devices.find((device) => device.id === deviceId);

      if (!currentDevice) {
        throw new Error(t("errors.deviceNotFound"));
      }

      Object.assign(currentDevice, {
        name: values.name.trim(),
        location: values.location.trim(),
        description: values.description,
        ipAddress,
        firmwareChannel: values.firmwareChannel,
        heartbeatIntervalMinutes: values.heartbeatIntervalMinutes,
        notes: values.notes,
      });

      appendAuditLog({
        userName: "Administrator",
        action: "UPDATE",
        entity: "device",
        description: `${currentDevice.name} at ${currentDevice.location} (${ipAddress}).`,
        deviceName: currentDevice.name,
      });

      return cloneRecord(currentDevice);
    }

    const createdDevice: DeviceDetails = {
      id: `dev-${mockDatabase.devices.length + 1}`,
      name: values.name.trim(),
      location: values.location.trim(),
      firmwareVersion: "1.0.0",
      firmwareChannel: values.firmwareChannel,
      /*
       * A terminal that has never sent a heartbeat is offline, and
       * `lastHeartbeatAt` is null rather than "now" — stamping the moment of
       * registration would claim the device reported in when it has not.
       */
      status: "offline",
      ipAddress,
      wifiStrength: 0,
      lastHeartbeatAt: null,
      queueSize: 0,
      description: values.description,
      heartbeatIntervalMinutes: values.heartbeatIntervalMinutes,
      notes: values.notes,
    };

    mockDatabase.devices.unshift(createdDevice);

    appendAuditLog({
      userName: "Administrator",
      action: "CREATE",
      entity: "device",
      description: `Registered ${createdDevice.name} at ${createdDevice.location} (${ipAddress}).`,
      deviceName: createdDevice.name,
    });

    return cloneRecord(createdDevice);
  });
}

export async function restartDevice(deviceId: string): Promise<DeviceDetails> {
  return mockRequest(() => {
    const device = mockDatabase.devices.find((item) => item.id === deviceId);

    if (!device) {
      throw new Error(t("errors.deviceNotFound"));
    }

    device.status = "warning";
    return cloneRecord(device);
  });
}

export async function updateDeviceFirmware(deviceId: string, firmwareVersion: string): Promise<DeviceDetails> {
  return mockRequest(() => {
    const device = mockDatabase.devices.find((item) => item.id === deviceId);

    if (!device) {
      throw new Error(t("errors.deviceNotFound"));
    }

    device.firmwareVersion = firmwareVersion;
    device.status = "maintenance";
    return cloneRecord(device);
  });
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await mockRequest(() => {
    const removed = mockDatabase.devices.find((device) => device.id === deviceId);
    mockDatabase.devices = mockDatabase.devices.filter((device) => device.id !== deviceId);

    if (removed) {
      appendAuditLog({
        userName: "Administrator",
        action: "DELETE",
        entity: "device",
        description: `Removed ${removed.name} at ${removed.location}.`,
        deviceName: removed.name,
      });
    }
  });
}