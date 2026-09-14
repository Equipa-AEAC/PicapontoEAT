<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { PhCheckCircle, PhCreditCard } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseErrorState,
  BaseFilterPanel,
  BaseFormDialog,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseSection,
  BaseSelect,
  BaseStatsCard,
  BaseStatusPill,
  BaseTable,
  BaseTableColumn,
  BaseTextInput,
} from "../../../../shared/components/base";
import { useCardsStore, useDevicesStore, useMembersStore } from "../../../../shared/stores";
import type { CardRegistrationValues, CardStatus } from "../../../../shared/types";
import { validateCardRegistration } from "../../../../shared/types";
import { formatTimestamp } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import {
  cardStatusLabel,
  cardStatusOptions,
  deviceStatusLabel,
} from "../../../../i18n/vocabulary";

/**
 * The RFID card inventory.
 *
 * The registration flow was a single text box asking for a UID. That is not how
 * a card enters the inventory: somebody stands at a terminal, holds a card
 * against the reader, and reads the number off it — and whichever terminal did
 * the reading is part of what happened. Recording it is what makes "which
 * terminal registered this card" answerable when a UID turns out to be wrong,
 * and it is the seam the real flow needs, because the terminal is what will
 * *supply* the UID once the device API exists.
 *
 * Assignment is part of the same act and optional within it. Registering a batch
 * of blank cards and handing them out later is a real thing people do; so is
 * registering one card for the member standing in front of you. The dialog
 * supports both rather than forcing a second trip through the table.
 */
const cardsStore = useCardsStore();
const membersStore = useMembersStore();
const devicesStore = useDevicesStore();

const searchQuery = ref("");
const statusFilter = ref<"all" | CardStatus>("all");

const registerVisible = ref(false);
const assignVisible = ref(false);
const replaceVisible = ref(false);
const deactivateConfirmVisible = ref(false);
const unassignConfirmVisible = ref(false);
const pendingUid = ref<string | null>(null);

const registerForm = reactive<CardRegistrationValues>({ deviceId: "", uid: "", ownerId: "" });
const assignForm = reactive({ uid: "", ownerId: "" });
const replaceForm = reactive({ oldUid: "", newUid: "" });

const statusFilterOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  ...cardStatusOptions(),
]);

/**
 * Terminals a card can be registered at.
 *
 * Offline terminals stay in the list and say so. A card genuinely can be
 * registered at a terminal that is currently unreachable — the person is
 * standing at it — and hiding it would leave them with an empty dropdown and no
 * explanation.
 */
const deviceOptions = computed(() =>
  devicesStore.items.map((device) => ({
    label: `${device.name} — ${device.location}${
      device.status === "online" ? "" : ` (${deviceStatusLabel(device.status)})`
    }`,
    value: device.id,
  })),
);

/** Members are offered with the card they already hold, so a swap is visible. */
const memberOptions = computed(() => [
  { label: t("admin.cards.leaveUnassigned"), value: "" },
  ...membersStore.allMembers.map((member) => ({
    label: `${member.fullName} • ${member.memberNumber}${
      member.assignedCardUid
        ? ` (${t("admin.cards.holdsCard", { uid: member.assignedCardUid })})`
        : ""
    }`,
    value: member.id,
  })),
]);

const assignMemberOptions = computed(() => memberOptions.value.slice(1));

const visibleCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return cardsStore.items.filter((card) => {
    const matchesQuery =
      query.length === 0 ||
      [card.uid, card.ownerName ?? "", card.registeredAtDeviceName ?? ""].join(" ").toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === "all" || card.status === statusFilter.value;

    return matchesQuery && matchesStatus;
  });
});

const hasActiveFilters = computed(() => searchQuery.value.trim().length > 0 || statusFilter.value !== "all");

const registerProblem = computed(() => validateCardRegistration(registerForm));

const statusTones: Record<CardStatus, "success" | "warning" | "danger" | "info"> = {
  available: "success",
  assigned: "info",
  inactive: "warning",
  replaced: "danger",
};

function clearFilters() {
  searchQuery.value = "";
  statusFilter.value = "all";
}

function openRegisterDialog() {
  cardsStore.clearMessages();
  registerForm.deviceId = deviceOptions.value[0]?.value ?? "";
  registerForm.uid = "";
  registerForm.ownerId = "";
  registerVisible.value = true;
}

/** Keep the terminal selected once devices arrive after the dialog was opened. */
watch(deviceOptions, (options) => {
  if (!registerForm.deviceId && options.length > 0) {
    registerForm.deviceId = options[0]!.value;
  }
});

async function submitRegister() {
  const created = await cardsStore.register({ ...registerForm });

  if (created) {
    registerVisible.value = false;
    await membersStore.loadAllMembers();
  }
}

function openAssignDialog(uid: string) {
  cardsStore.clearMessages();
  assignForm.uid = uid;
  assignForm.ownerId = assignMemberOptions.value[0]?.value ?? "";
  assignVisible.value = true;
}

async function submitAssign() {
  if (!assignForm.ownerId) {
    return;
  }

  const member = membersStore.allMembers.find((item) => item.id === assignForm.ownerId);
  const assigned = await cardsStore.assignCardToMember(assignForm.uid, assignForm.ownerId, member?.fullName ?? "");

  if (assigned) {
    assignVisible.value = false;
    await membersStore.loadAllMembers();
  }
}

function requestUnassign(uid: string) {
  pendingUid.value = uid;
  unassignConfirmVisible.value = true;
}

async function confirmUnassign() {
  if (pendingUid.value) {
    await cardsStore.unassignCardByUid(pendingUid.value);
    await membersStore.loadAllMembers();
  }

  pendingUid.value = null;
  unassignConfirmVisible.value = false;
}

function openReplaceDialog(uid: string) {
  cardsStore.clearMessages();
  replaceForm.oldUid = uid;
  replaceForm.newUid = "";
  replaceVisible.value = true;
}

async function submitReplace() {
  if (!replaceForm.newUid.trim()) {
    return;
  }

  const replaced = await cardsStore.replaceCardByUid(replaceForm.oldUid, replaceForm.newUid.trim());

  if (replaced) {
    replaceVisible.value = false;
  }
}

function requestDeactivate(uid: string) {
  pendingUid.value = uid;
  deactivateConfirmVisible.value = true;
}

async function confirmDeactivate() {
  if (pendingUid.value) {
    await cardsStore.deactivateCardByUid(pendingUid.value);
  }

  pendingUid.value = null;
  deactivateConfirmVisible.value = false;
}

onMounted(async () => {
  await Promise.all([cardsStore.loadCards(), membersStore.loadAllMembers(), devicesStore.loadDevices()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.cards.title')"
      :description="$t('admin.cards.description')"
    >
      <template #actions>
        <BaseButton :label="$t('common.actions.refresh')" severity="secondary" outlined :loading="cardsStore.loading" @click="cardsStore.loadCards()" />
        <BaseButton :disabled="deviceOptions.length === 0" @click="openRegisterDialog()">
          <PhCreditCard weight="bold" />
          {{ $t("admin.cards.registerTitle") }}
        </BaseButton>
      </template>
    </BasePageHeader>

    <BaseErrorState v-if="cardsStore.errorMessage && !registerVisible" :message="cardsStore.errorMessage" @retry="cardsStore.loadCards()" />

    <p v-if="cardsStore.successMessage" class="form-success-banner">
      <PhCheckCircle weight="fill" />
      {{ cardsStore.successMessage }}
    </p>

    <section class="metric-grid">
      <BaseStatsCard :label="$t('admin.cards.metricTotal')" :value="String(cardsStore.items.length)" :caption="$t('admin.cards.metricTotalCaption')" />
      <BaseStatsCard :label="$t('admin.cards.metricAvailable')" :value="String(cardsStore.availableCount)" :caption="$t('admin.cards.metricAvailableCaption')" />
      <BaseStatsCard :label="$t('admin.cards.metricAssigned')" :value="String(cardsStore.assignedCount)" :caption="$t('admin.cards.metricAssignedCaption')" />
      <BaseStatsCard :label="$t('admin.cards.metricRetired')" :value="String(cardsStore.retiredCount)" :caption="$t('admin.cards.metricRetiredCaption')" />
    </section>

    <!--
      No terminal, no registration. Said plainly rather than leaving the button
      disabled with no explanation of what is missing.
    -->
    <BaseCard
      v-if="deviceOptions.length === 0 && !devicesStore.loading"
      :title="$t('admin.cards.noTerminalTitle')"
      :description="$t('admin.cards.noTerminalDescription')"
    />

    <BaseFilterPanel :title="$t('admin.cards.filtersTitle')" :description="$t('admin.cards.filtersDescription')">
      <div class="filter-strip">
        <BaseSearchBar v-model="searchQuery" :placeholder="$t('admin.cards.search')" />
        <BaseSelect v-model="statusFilter" :options="statusFilterOptions" />
        <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>
    </BaseFilterPanel>

    <BaseLoading v-if="cardsStore.loading" />

    <BaseSection v-else :title="$t('admin.cards.tableTitle')" :description="$t('admin.cards.tableDescription')">
      <BaseCard>
        <BaseTable :value="visibleCards" dataKey="id" paginator :rows="8">
          <template #empty>
            <BaseEmptyState
              :title="$t('admin.cards.emptyTitle')"
              :description="
                hasActiveFilters
                  ? $t('admin.cards.emptyFiltered')
                  : $t('admin.cards.emptyNone')
              "
              :action-label="
                hasActiveFilters ? $t('common.actions.clearFilters') : $t('admin.cards.registerTitle')
              "
              @action="hasActiveFilters ? clearFilters() : openRegisterDialog()"
            />
          </template>

          <BaseTableColumn field="uid" header="UID" sortable />
          <BaseTableColumn :header="$t('admin.cards.colOwner')">
            <template #body="slotProps">{{ slotProps.data.ownerName ?? "Unassigned" }}</template>
          </BaseTableColumn>
          <BaseTableColumn :header="$t('admin.cards.colRegisteredAt')">
            <template #body="slotProps">
              <div class="cell-stack">
                <span>{{ slotProps.data.registeredAtDeviceName ?? "Not recorded" }}</span>
                <small>{{ formatTimestamp(slotProps.data.registeredAt) }}</small>
              </div>
            </template>
          </BaseTableColumn>
          <BaseTableColumn :header="$t('common.fields.status')">
            <template #body="slotProps">
              <BaseStatusPill
                :label="cardStatusLabel(slotProps.data.status as CardStatus)"
                :tone="statusTones[slotProps.data.status as CardStatus]"
              />
            </template>
          </BaseTableColumn>
          <BaseTableColumn field="lastScanAt" :header="$t('admin.cards.colLastScan')">
            <template #body="slotProps">{{ formatTimestamp(slotProps.data.lastScanAt) }}</template>
          </BaseTableColumn>
          <BaseTableColumn :header="$t('common.fields.actions')">
            <template #body="slotProps">
              <div class="inline-actions">
                <BaseButton
                  v-if="slotProps.data.status === 'available'"
                  :label="$t('admin.cards.assign')"
                  text
                  size="small"
                  @click="openAssignDialog(slotProps.data.uid)"
                />
                <BaseButton
                  v-if="slotProps.data.status === 'assigned'"
                  :label="$t('admin.cards.unassign')"
                  text
                  size="small"
                  @click="requestUnassign(slotProps.data.uid)"
                />
                <BaseButton
                  :label="$t('admin.cards.replace')"
                  text
                  size="small"
                  :disabled="slotProps.data.status === 'replaced'"
                  @click="openReplaceDialog(slotProps.data.uid)"
                />
                <BaseButton
                  :label="$t('admin.cards.deactivate')"
                  text
                  size="small"
                  severity="danger"
                  :disabled="slotProps.data.status === 'inactive'"
                  @click="requestDeactivate(slotProps.data.uid)"
                />
              </div>
            </template>
          </BaseTableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>

    <!-- ------------------------------------------------------- Registration -->
    <BaseFormDialog
      :visible="registerVisible"
      :title="$t('admin.cards.registerTitle')"
      :subtitle="$t('admin.cards.registerSubtitle')"
      :confirm-label="$t('admin.cards.registerTitle')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="cardsStore.saving"
      :confirm-disabled="registerProblem !== null"
      @update:visible="registerVisible = $event"
      @confirm="submitRegister"
      @cancel="registerVisible = false"
    >
      <p v-if="cardsStore.errorMessage" class="form-error-banner">{{ cardsStore.errorMessage }}</p>

      <div class="settings-grid">
        <label class="settings-grid__wide">
          <span>{{ $t("admin.cards.fieldTerminal") }}</span>
          <BaseSelect v-model="registerForm.deviceId" :options="deviceOptions" :placeholder="$t('admin.cards.pickTerminal')" />
          <small class="student-form__hint">
            {{ $t("admin.cards.terminalHint") }}
          </small>
        </label>

        <label class="settings-grid__wide">
          <span>{{ $t("admin.cards.fieldUid") }}</span>
          <BaseTextInput v-model="registerForm.uid" placeholder="04A1B2C3" />
          <small class="student-form__hint">
            {{ $t("admin.cards.uidHint") }}
          </small>
        </label>

        <label class="settings-grid__wide">
          <span>{{ $t("admin.cards.fieldAssignTo") }}</span>
          <BaseSelect v-model="registerForm.ownerId" :options="memberOptions" />
          <small class="student-form__hint">
            {{ $t("admin.cards.assignHint") }}
          </small>
        </label>
      </div>

      <p v-if="registerProblem" class="type-meta">{{ registerProblem }}</p>
    </BaseFormDialog>

    <BaseFormDialog
      :visible="assignVisible"
      :title="$t('admin.cards.assignTitle')"
      :subtitle="$t('admin.cards.assignSubtitle', { uid: assignForm.uid })"
      :confirm-label="$t('admin.cards.assign')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="cardsStore.saving"
      @update:visible="assignVisible = $event"
      @confirm="submitAssign"
      @cancel="assignVisible = false"
    >
      <p v-if="cardsStore.errorMessage" class="form-error-banner">{{ cardsStore.errorMessage }}</p>

      <label>
        <span>{{ $t("admin.cards.fieldMember") }}</span>
        <BaseSelect v-model="assignForm.ownerId" :options="assignMemberOptions" />
      </label>
    </BaseFormDialog>

    <BaseFormDialog
      :visible="replaceVisible"
      :title="$t('admin.cards.replaceTitle')"
      :subtitle="$t('admin.cards.replaceSubtitle', { uid: replaceForm.oldUid })"
      :confirm-label="$t('admin.cards.replace')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="cardsStore.saving"
      @update:visible="replaceVisible = $event"
      @confirm="submitReplace"
      @cancel="replaceVisible = false"
    >
      <p v-if="cardsStore.errorMessage" class="form-error-banner">{{ cardsStore.errorMessage }}</p>

      <label>
        <span>{{ $t("admin.cards.fieldNewUid") }}</span>
        <BaseTextInput v-model="replaceForm.newUid" placeholder="04A1B2C3" />
      </label>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="unassignConfirmVisible"
      :title="$t('admin.cards.unassignTitle')"
      :message="$t('admin.cards.unassignMessage')"
      :confirm-label="$t('admin.cards.unassign')"
      :cancel-label="$t('common.actions.cancel')"
      severity="primary"
      @update:visible="unassignConfirmVisible = $event"
      @confirm="confirmUnassign"
      @cancel="unassignConfirmVisible = false"
    />

    <BaseConfirmDialog
      :visible="deactivateConfirmVisible"
      :title="$t('admin.cards.deactivateTitle')"
      :message="$t('admin.cards.deactivateMessage')"
      :confirm-label="$t('admin.cards.deactivate')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      @update:visible="deactivateConfirmVisible = $event"
      @confirm="confirmDeactivate"
      @cancel="deactivateConfirmVisible = false"
    />
  </section>
</template>
