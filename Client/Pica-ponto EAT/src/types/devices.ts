export type DeviceStatus = "online" | "offline" | "warning" | "maintenance";
export type FirmwareChannel = "stable" | "beta" | "edge";

export interface DeviceSummary {
  id: string;
  name: string;
  location: string;
  firmwareVersion: string;
  firmwareChannel: FirmwareChannel;
  status: DeviceStatus;
  ipAddress: string;
  wifiStrength: number;
  lastHeartbeatAt: string;
  queueSize: number;
}

export interface DeviceDetails extends DeviceSummary {
  description: string;
  heartbeatIntervalMinutes: number;
  notes: string;
}

export interface DeviceFormValues {
  name: string;
  location: string;
  description: string;
  firmwareChannel: FirmwareChannel;
  heartbeatIntervalMinutes: number;
  notes: string;
}

export interface DeviceFilters {
  query: string;
  status: DeviceStatus | "all";
  firmwareChannel: FirmwareChannel | "all";
}
