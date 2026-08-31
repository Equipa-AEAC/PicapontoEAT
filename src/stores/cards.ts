import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { RfidCardFilters, RfidCardSummary } from "../types/cards";
import { assignCard, deactivateCard, listCards, registerCard, replaceCard, saveCard } from "../services/cards.service";
import { describeError } from "../utils/errors";

export const useCardsStore = defineStore("cards", () => {
  const items = ref<RfidCardSummary[]>([]);
  const filters = ref<RfidCardFilters>({ query: "", status: "all" });
  const loading = ref(false);
  const saving = ref(false);
  /** A failed request must never be shown as an empty result. */
  const errorMessage = ref<string | null>(null);

  const availableCount = computed(() => items.value.filter((card) => card.status === "available").length);

  async function loadCards() {
    loading.value = true;
    errorMessage.value = null;
    try {
      items.value = await listCards(filters.value);
    } catch (error) {
      errorMessage.value = describeError(error, "Cards could not be loaded.");
    } finally {
      loading.value = false;
    }
  }

  async function createCard(uid: string) {
    saving.value = true;
    try {
      await registerCard(uid);
      await loadCards();
    } finally {
      saving.value = false;
    }
  }

  async function persistCard(uid: string, ownerId = "", ownerName = "") {
    saving.value = true;
    try {
      await saveCard({ uid, ownerId, status: "available", assignedAt: new Date().toISOString() });
      if (ownerId) {
        await assignCard(ownerId, uid, ownerName);
      }
      await loadCards();
    } finally {
      saving.value = false;
    }
  }

  async function deactivateCardByUid(uid: string) {
    await deactivateCard(uid);
    await loadCards();
  }

  async function replaceCardByUid(oldUid: string, newUid: string) {
    await replaceCard(oldUid, newUid);
    await loadCards();
  }

  return {
    items,
    filters,
    loading,
    saving,
    errorMessage,
    availableCount,
    loadCards,
    createCard,
    persistCard,
    deactivateCardByUid,
    replaceCardByUid,
  };
});
