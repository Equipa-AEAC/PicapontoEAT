import type {
  CardRegistrationValues,
  RfidCardFilters,
  RfidCardFormValues,
  RfidCardSummary,
} from "../types/cards";
import { validateCardRegistration } from "../types/cards";

import { appendAuditLog } from "./audit.service";
import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";
import { t } from "../i18n";

/*
 * RFID card inventory.
 *
 * BACKEND CONTRACT: registration is a device operation. Today the UID is typed
 * and the terminal is recorded alongside it; when the device API exists, the
 * terminal is what *supplies* the UID — `POST /devices/:id/read-card` returns
 * what the reader saw, and this service stores it. The shape below already
 * carries the terminal for that reason. See docs/ai/BACKEND_CONTRACTS.md.
 */

export async function listCards(filters: Partial<RfidCardFilters> = {}): Promise<RfidCardSummary[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    return cloneRecord(
      mockDatabase.cards.filter((card) => {
        const matchesQuery =
          query.length === 0 ||
          [card.uid, card.ownerName ?? "", card.status, card.registeredAtDeviceName ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesStatus = !filters.status || filters.status === "all" || card.status === filters.status;

        return matchesQuery && matchesStatus;
      }),
    );
  });
}

/**
 * Register a card read at a terminal, optionally assigning it in the same step.
 *
 * One call rather than two because it is one act: somebody stands at a reader
 * with a card and a member in front of them. Splitting it left the inventory
 * holding cards whose owner was known at the moment they were registered and
 * recorded minutes later, or not at all.
 */
export async function registerCard(values: CardRegistrationValues): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const problem = validateCardRegistration(values);

    if (problem) {
      throw new Error(problem);
    }

    const uid = values.uid.trim().toUpperCase();
    const device = mockDatabase.devices.find((item) => item.id === values.deviceId);

    if (!device) {
      throw new Error(t("errors.terminalNotRegistered"));
    }

    if (mockDatabase.cards.some((card) => card.uid.toUpperCase() === uid)) {
      throw new Error(t("errors.cardAlreadyRegistered", { uid }));
    }

    const owner = values.ownerId
      ? mockDatabase.members.find((member) => member.id === values.ownerId) ?? null
      : null;

    if (values.ownerId && !owner) {
      throw new Error(t("errors.memberNotFound"));
    }

    const now = new Date().toISOString();

    const createdCard: RfidCardSummary = {
      id: `card-${mockDatabase.cards.length + 1}`,
      uid,
      ownerName: owner?.fullName ?? null,
      ownerId: owner?.id ?? null,
      status: owner ? "assigned" : "available",
      lastScanAt: null,
      assignedAt: owner ? now : null,
      replacedByUid: null,
      registeredAtDeviceId: device.id,
      registeredAtDeviceName: `${device.name} — ${device.location}`,
      registeredAt: now,
    };

    mockDatabase.cards.unshift(createdCard);

    if (owner) {
      owner.assignedCardUid = uid;
    }

    appendAuditLog({
      userName: "Administrator",
      action: "CREATE",
      entity: "card",
      description: `Registered ${uid} at ${createdCard.registeredAtDeviceName}${owner ? ` and assigned it to ${owner.fullName}` : " (unassigned)"}.`,
      deviceName: device.name,
    });

    return cloneRecord(createdCard);
  });
}

export async function assignCard(ownerId: string, cardUid: string, ownerName: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const card = mockDatabase.cards.find((item) => item.uid === cardUid);

    if (!card) {
      throw new Error(t("errors.cardNotFound"));
    }

    card.ownerId = ownerId;
    card.ownerName = ownerName;
    card.status = "assigned";
    card.assignedAt = new Date().toISOString();

    const member = mockDatabase.members.find((item) => item.id === ownerId);

    if (member) {
      member.assignedCardUid = card.uid;
    }

    appendAuditLog({
      userName: "Administrator",
      action: "UPDATE",
      entity: "card",
      description: `Assigned ${card.uid} to ${ownerName}.`,
    });

    return cloneRecord(card);
  });
}

/** Detach a card from its owner without retiring it — it returns to the inventory. */
export async function unassignCard(cardUid: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const card = mockDatabase.cards.find((item) => item.uid === cardUid);

    if (!card) {
      throw new Error(t("errors.cardNotFound"));
    }

    const previousOwner = card.ownerId
      ? mockDatabase.members.find((item) => item.id === card.ownerId)
      : undefined;

    if (previousOwner?.assignedCardUid === card.uid) {
      previousOwner.assignedCardUid = null;
    }

    appendAuditLog({
      userName: "Administrator",
      action: "UPDATE",
      entity: "card",
      description: `Unassigned ${card.uid}${card.ownerName ? ` from ${card.ownerName}` : ""}.`,
    });

    card.ownerId = null;
    card.ownerName = null;
    card.status = "available";
    card.assignedAt = null;

    return cloneRecord(card);
  });
}

export async function deactivateCard(cardUid: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const card = mockDatabase.cards.find((item) => item.uid === cardUid);

    if (!card) {
      throw new Error(t("errors.cardNotFound"));
    }

    card.status = "inactive";

    appendAuditLog({
      userName: "Administrator",
      action: "UPDATE",
      entity: "card",
      description: `Deactivated ${card.uid}.`,
    });

    return cloneRecord(card);
  });
}

export async function replaceCard(oldUid: string, newUid: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const card = mockDatabase.cards.find((item) => item.uid === oldUid);

    if (!card) {
      throw new Error(t("errors.cardNotFound"));
    }

    card.status = "replaced";
    card.replacedByUid = newUid.trim().toUpperCase();

    appendAuditLog({
      userName: "Administrator",
      action: "UPDATE",
      entity: "card",
      description: `Replaced ${card.uid} with ${card.replacedByUid}.`,
    });

    return cloneRecord(card);
  });
}

export async function saveCard(values: RfidCardFormValues): Promise<RfidCardSummary> {
  const student = values.ownerId
    ? mockDatabase.members.find((item) => item.id === values.ownerId)
    : undefined;

  if (values.ownerId && !student) {
    throw new Error(t("errors.studentNotFound"));
  }

  if (student) {
    return assignCard(student.id, values.uid, student.fullName);
  }

  /*
   * A card created without going through the registration dialog has no terminal
   * behind it. It is recorded as such rather than being attributed to a device
   * nobody used — an invented provenance is worse than an absent one.
   */
  return mockRequest(() => {
    const uid = values.uid.trim().toUpperCase();

    const createdCard: RfidCardSummary = {
      id: `card-${mockDatabase.cards.length + 1}`,
      uid,
      ownerName: null,
      ownerId: null,
      status: "available",
      lastScanAt: null,
      assignedAt: null,
      replacedByUid: null,
      registeredAtDeviceId: null,
      registeredAtDeviceName: null,
      registeredAt: new Date().toISOString(),
    };

    mockDatabase.cards.unshift(createdCard);
    return cloneRecord(createdCard);
  });
}
