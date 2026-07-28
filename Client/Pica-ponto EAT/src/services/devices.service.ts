import type { DeviceDetails, DeviceFilters, DeviceFormValues } from "../types/devices";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

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
    if (deviceId) {
      const currentDevice = mockDatabase.devices.find((device) => device.id === deviceId);

      if (!currentDevice) {
        throw new Error("Device not found.");
      }

      Object.assign(currentDevice, {
        name: values.name,
        location: values.location,
        description: values.description,
        firmwareChannel: values.firmwareChannel,
        heartbeatIntervalMinutes: values.heartbeatIntervalMinutes,
        notes: values.notes,
      });

      return cloneRecord(currentDevice);
    }

    const createdDevice: DeviceDetails = {
      id: `dev-${mockDatabase.devices.length + 1}`,
      name: values.name,
      location: values.location,
      firmwareVersion: "1.0.0",
      firmwareChannel: values.firmwareChannel,
      status: "offline",
      ipAddress: "0.0.0.0",
      wifiStrength: 0,
      lastHeartbeatAt: new Date().toISOString(),
      queueSize: 0,
      description: values.description,
      heartbeatIntervalMinutes: values.heartbeatIntervalMinutes,
      notes: values.notes,
    };

    mockDatabase.devices.unshift(createdDevice);
    return cloneRecord(createdDevice);
  });
}

export async function restartDevice(deviceId: string): Promise<DeviceDetails> {
  return mockRequest(() => {
    const device = mockDatabase.devices.find((item) => item.id === deviceId);

    if (!device) {
      throw new Error("Device not found.");
    }

    device.status = "warning";
    return cloneRecord(device);
  });
}

export async function updateDeviceFirmware(deviceId: string, firmwareVersion: string): Promise<DeviceDetails> {
  return mockRequest(() => {
    const device = mockDatabase.devices.find((item) => item.id === deviceId);

    if (!device) {
      throw new Error("Device not found.");
    }

    device.firmwareVersion = firmwareVersion;
    device.status = "maintenance";
    return cloneRecord(device);
  });
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await mockRequest(() => {
    mockDatabase.devices = mockDatabase.devices.filter((device) => device.id !== deviceId);
  });
}