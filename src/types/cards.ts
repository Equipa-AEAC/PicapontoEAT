import { t } from "../i18n";

export type CardStatus = "available" | "assigned" | "inactive" | "replaced";

export interface RfidCardSummary {
  id: string;
  uid: string;
  ownerName: string | null;
  ownerId: string | null;
  status: CardStatus;
  lastScanAt: string | null;
  assignedAt: string | null;
  replacedByUid: string | null;
  /**
   * The terminal the card was read at when it entered the inventory.
   *
   * A UID is not typed from memory — it is read off a card held against a
   * reader, and which reader that was is part of what happened. Recording it is
   * what lets somebody ask "which terminal registered this card" when a UID
   * turns out to be wrong, and it is the seam the real registration flow needs:
   * the terminal is what will supply the UID once the device API exists.
   *
   * Null for cards that predate the field.
   */
  registeredAtDeviceId: string | null;
  registeredAtDeviceName: string | null;
  registeredAt: string | null;
}

export interface RfidCardFormValues {
  uid: string;
  ownerId: string;
  status: CardStatus;
  assignedAt: string;
}

/** What the register-card dialog collects. Assignment is optional by design. */
export interface CardRegistrationValues {
  /** The terminal the card is being read at. Required. */
  deviceId: string;
  uid: string;
  /** Empty when the card enters the inventory unassigned. */
  ownerId: string;
}

export interface RfidCardFilters {
  query: string;
  status: CardStatus | "all";
}

/** Why a registration cannot be saved, or null when it can. Shared by dialog and service. */
export function validateCardRegistration(values: CardRegistrationValues): string | null {
  if (!values.deviceId) {
    return t("errors.cardNeedsTerminal");
  }

  if (!values.uid.trim()) {
    return t("errors.cardUidRequired");
  }

  if (!/^[0-9A-Fa-f]{8,20}$/.test(values.uid.trim())) {
    return t("errors.cardUidFormat");
  }

  return null;
}
