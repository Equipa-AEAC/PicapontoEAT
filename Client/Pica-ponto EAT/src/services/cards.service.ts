import type { RfidCardFilters, RfidCardFormValues, RfidCardSummary } from "../types/cards";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function listCards(filters: Partial<RfidCardFilters> = {}): Promise<RfidCardSummary[]> {
  return mockRequest(() => {
    const query = filters.query?.trim().toLowerCase() ?? "";

    return cloneRecord(
      mockDatabase.cards.filter((card) => {
        const matchesQuery =
          query.length === 0 || [card.uid, card.ownerName ?? "", card.status].join(" ").toLowerCase().includes(query);
        const matchesStatus = !filters.status || filters.status === "all" || card.status === filters.status;

        return matchesQuery && matchesStatus;
      }),
    );
  });
}

export async function registerCard(uid: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const createdCard: RfidCardSummary = {
      id: `card-${mockDatabase.cards.length + 1}`,
      uid,
      ownerName: null,
      ownerId: null,
      status: "available",
      lastScanAt: null,
      assignedAt: null,
      replacedByUid: null,
    };

    mockDatabase.cards.unshift(createdCard);
    return cloneRecord(createdCard);
  });
}

export async function assignCard(ownerId: string, cardUid: string, ownerName: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const card = mockDatabase.cards.find((item) => item.uid === cardUid);

    if (!card) {
      throw new Error("Card not found.");
    }

    card.ownerId = ownerId;
    card.ownerName = ownerName;
    card.status = "assigned";
    card.assignedAt = new Date().toISOString();
    return cloneRecord(card);
  });
}

export async function deactivateCard(cardUid: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const card = mockDatabase.cards.find((item) => item.uid === cardUid);

    if (!card) {
      throw new Error("Card not found.");
    }

    card.status = "inactive";
    return cloneRecord(card);
  });
}

export async function replaceCard(oldUid: string, newUid: string): Promise<RfidCardSummary> {
  return mockRequest(() => {
    const card = mockDatabase.cards.find((item) => item.uid === oldUid);

    if (!card) {
      throw new Error("Card not found.");
    }

    card.status = "replaced";
    card.replacedByUid = newUid;
    return cloneRecord(card);
  });
}

export async function saveCard(values: RfidCardFormValues): Promise<RfidCardSummary> {
  if (values.ownerId) {
    const student = mockDatabase.members.find((item) => item.id === values.ownerId);

    if (!student) {
      throw new Error("Student not found.");
    }

    return assignCard(student.id, values.uid, student.fullName);
  }

  return registerCard(values.uid);
}
