import { t } from "../i18n";

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
  /** Null until the terminal has actually reported in. Never stamped at registration. */
  lastHeartbeatAt: string | null;
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
  /**
   * Where the terminal is reachable on the network.
   *
   * A terminal that cannot be addressed cannot be talked to, so this is part of
   * registering one rather than something the device reports later. New devices
   * used to be created with a literal `0.0.0.0` the form never offered to
   * change, which meant every terminal added through the UI was unreachable and
   * the page said so in a column nobody could edit.
   */
  ipAddress: string;
  firmwareChannel: FirmwareChannel;
  heartbeatIntervalMinutes: number;
  notes: string;
}

/**
 * Why a device cannot be saved, or null when it can.
 *
 * Pure and shared by the dialog and the service. IPv4 only, which is what the
 * terminals on this network actually use — accepting a hostname here would mean
 * accepting something the firmware cannot resolve.
 */
export function validateDevice(values: DeviceFormValues): string | null {
  if (!values.name.trim()) {
    return t("errors.deviceNeedsName");
  }

  if (!values.location.trim()) {
    return t("errors.deviceNeedsLocation");
  }

  const address = values.ipAddress.trim();

  if (!address) {
    return t("errors.deviceNeedsIp");
  }

  const octets = address.split(".");

  if (
    octets.length !== 4 ||
    octets.some((octet) => !/^\d{1,3}$/.test(octet) || Number(octet) > 255)
  ) {
    return t("errors.deviceIpFormat");
  }

  if (values.heartbeatIntervalMinutes < 1) {
    return t("errors.heartbeatTooShort");
  }

  return null;
}

export interface DeviceFilters {
  query: string;
  status: DeviceStatus | "all";
  firmwareChannel: FirmwareChannel | "all";
}
