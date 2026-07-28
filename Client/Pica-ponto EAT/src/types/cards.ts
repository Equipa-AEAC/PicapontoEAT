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
}

export interface RfidCardFormValues {
  uid: string;
  ownerId: string;
  status: CardStatus;
  assignedAt: string;
}

export interface RfidCardFilters {
  query: string;
  status: CardStatus | "all";
}
