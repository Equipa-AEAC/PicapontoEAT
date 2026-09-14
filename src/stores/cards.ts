import { computed, ref } from "vue";
import { t } from "../i18n";
import { defineStore } from "pinia";

import type { CardRegistrationValues, RfidCardFilters, RfidCardSummary } from "../types/cards";
import {
  assignCard,
  deactivateCard,
  listCards,
  registerCard,
  replaceCard,
  unassignCard,
} from "../services/cards.service";
import { describeError } from "../utils/errors";

export const useCardsStore = defineStore("cards", () => {
  const items = ref<RfidCardSummary[]>([]);
  const filters = ref<RfidCardFilters>({ query: "", status: "all" });
  const loading = ref(false);
  const saving = ref(false);
  /** A failed request must never be shown as an empty result. */
  const errorMessage = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const availableCount = computed(() => items.value.filter((card) => card.status === "available").length);
  const assignedCount = computed(() => items.value.filter((card) => card.status === "assigned").length);
  const retiredCount = computed(
    () => items.value.filter((card) => card.status === "inactive" || card.status === "replaced").length,
  );

  function clearMessages() {
    errorMessage.value = null;
    successMessage.value = null;
  }

  async function loadCards() {
    loading.value = true;
    errorMessage.value = null;

    try {
      items.value = await listCards(filters.value);
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.loadCards"));
    } finally {
      loading.value = false;
    }
  }

  async function runMutation<T>(mutation: () => Promise<T>, success: string): Promise<T | null> {
    saving.value = true;
    clearMessages();

    try {
      const result = await mutation();
      await loadCards();
      successMessage.value = success;
      return result;
    } catch (error) {
      errorMessage.value = describeError(error, t("errors.saveCard"));
      return null;
    } finally {
      saving.value = false;
    }
  }

  /** Register a card read at a terminal, assigning it in the same step when asked. */
  async function register(values: CardRegistrationValues) {
    return runMutation(
      () => registerCard(values),
      values.ownerId ? t("common.feedback.cardRegisteredAssigned") : t("common.feedback.cardRegisteredUnassigned"),
    );
  }

  async function assignCardToMember(uid: string, ownerId: string, ownerName: string) {
    return runMutation(() => assignCard(ownerId, uid, ownerName), t("common.feedback.cardAssigned", { uid, name: ownerName }));
  }

  async function unassignCardByUid(uid: string) {
    return runMutation(() => unassignCard(uid), t("common.feedback.cardReturned", { uid }));
  }

  async function deactivateCardByUid(uid: string) {
    return runMutation(() => deactivateCard(uid), t("common.feedback.cardDeactivated", { uid }));
  }

  async function replaceCardByUid(oldUid: string, newUid: string) {
    return runMutation(() => replaceCard(oldUid, newUid), t("common.feedback.cardReplaced", { uid: oldUid }));
  }

  return {
    items,
    filters,
    loading,
    saving,
    errorMessage,
    successMessage,
    availableCount,
    assignedCount,
    retiredCount,
    clearMessages,
    loadCards,
    register,
    assignCardToMember,
    unassignCardByUid,
    deactivateCardByUid,
    replaceCardByUid,
  };
});
