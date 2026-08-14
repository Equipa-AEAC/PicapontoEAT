<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

import BaseButton from "../../../../components/base/BaseButton.vue";
import BaseCard from "../../../../components/base/BaseCard.vue";
import BaseConfirmDialog from "../../../../components/base/BaseConfirmDialog.vue";
import BaseEmptyState from "../../../../components/base/BaseEmptyState.vue";
import BaseFormDialog from "../../../../components/base/BaseFormDialog.vue";
import BaseLoading from "../../../../components/base/BaseLoading.vue";
import BasePageHeader from "../../../../components/base/BasePageHeader.vue";
import BaseSearchBar from "../../../../components/base/BaseSearchBar.vue";
import BaseSection from "../../../../components/base/BaseSection.vue";
import BaseSelect from "../../../../components/base/BaseSelect.vue";
import BaseStatsCard from "../../../../components/base/BaseStatsCard.vue";
import BaseStatusPill from "../../../../components/base/BaseStatusPill.vue";
import BaseTable from "../../../../components/base/BaseTable.vue";
import TableColumn from "../../../../components/base/TableColumn.vue";
import BaseTextInput from "../../../../components/base/BaseTextInput.vue";
import { useCardsStore } from "../../../../stores/cards";
import { useMembersStore } from "../../../../stores/members";
import type { CardStatus } from "../../../../types/cards";

const cardsStore = useCardsStore();
const membersStore = useMembersStore();

const searchQuery = ref("");
const statusFilter = ref<"all" | CardStatus>("all");

const registerVisible = ref(false);
const assignVisible = ref(false);
const replaceVisible = ref(false);
const deactivateConfirmVisible = ref(false);
const pendingUid = ref<string | null>(null);

const registerForm = reactive({ uid: "" });
const assignForm = reactive({ uid: "", ownerId: "" });
const replaceForm = reactive({ oldUid: "", newUid: "" });

const statusFilterOptions = [
  { label: "All statuses", value: "all" },
  { label: "Available", value: "available" },
  { label: "Assigned", value: "assigned" },
  { label: "Inactive", value: "inactive" },
  { label: "Replaced", value: "replaced" },
];

const memberOptions = computed(() => membersStore.items.map((member) => ({ label: `${member.fullName} • ${member.memberNumber}`, value: member.id })));

const visibleCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return cardsStore.items.filter((card) => {
    const matchesQuery = query.length === 0 || [card.uid, card.ownerName ?? ""].join(" ").toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === "all" || card.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

function openRegisterDialog() {
  registerForm.uid = "";
  registerVisible.value = true;
}

async function submitRegister() {
  if (!registerForm.uid.trim()) return;
  await cardsStore.createCard(registerForm.uid.trim());
  registerVisible.value = false;
}

function openAssignDialog(uid: string) {
  assignForm.uid = uid;
  assignForm.ownerId = memberOptions.value[0]?.value ?? "";
  assignVisible.value = true;
}

async function submitAssign() {
  if (!assignForm.ownerId) return;
  const member = membersStore.items.find((item) => item.id === assignForm.ownerId);
  await cardsStore.persistCard(assignForm.uid, assignForm.ownerId, member?.fullName ?? "");
  assignVisible.value = false;
}

function openReplaceDialog(uid: string) {
  replaceForm.oldUid = uid;
  replaceForm.newUid = "";
  replaceVisible.value = true;
}

async function submitReplace() {
  if (!replaceForm.newUid.trim()) return;
  await cardsStore.replaceCardByUid(replaceForm.oldUid, replaceForm.newUid.trim());
  replaceVisible.value = false;
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

const statusTones: Record<CardStatus, "success" | "warning" | "danger" | "info"> = {
  available: "success",
  assigned: "info",
  inactive: "warning",
  replaced: "danger",
};

onMounted(async () => {
  await Promise.all([cardsStore.loadCards(), membersStore.loadMembers()]);
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Cards"
      description="Register blank RFID cards, assign them to members, and deactivate or replace lost cards independent of a member record."
    >
      <template #actions>
        <BaseButton label="Refresh" severity="secondary" outlined :loading="cardsStore.loading" @click="cardsStore.loadCards()" />
        <BaseButton label="Register card" @click="openRegisterDialog()" />
      </template>
    </BasePageHeader>

    <section class="metric-grid">
      <BaseStatsCard label="Total cards" :value="String(cardsStore.items.length)" caption="Cards on record" />
      <BaseStatsCard label="Available" :value="String(cardsStore.availableCount)" caption="Ready for assignment" />
      <BaseStatsCard label="Assigned" :value="String(cardsStore.items.filter((card) => card.status === 'assigned').length)" caption="Linked to a member" />
      <BaseStatsCard label="Inactive/replaced" :value="String(cardsStore.items.filter((card) => card.status === 'inactive' || card.status === 'replaced').length)" caption="No longer in circulation" />
    </section>

    <BaseCard title="Filters" description="Search and segment cards by status.">
      <div class="filter-strip">
        <BaseSearchBar v-model="searchQuery" placeholder="Search by UID or owner" />
        <BaseSelect v-model="statusFilter" :options="statusFilterOptions" />
      </div>
    </BaseCard>

    <BaseLoading v-if="cardsStore.loading" />

    <BaseSection v-else title="Card registry" description="Every card's assignment state and quick actions.">
      <BaseCard>
        <BaseTable :value="visibleCards" dataKey="id" paginator :rows="8">
          <template #empty>
            <BaseEmptyState title="No cards found" description="Adjust the filters or register a new card." action-label="Register card" @action="openRegisterDialog()" />
          </template>

          <TableColumn field="uid" header="UID" sortable />
          <TableColumn header="Owner">
            <template #body="slotProps">{{ slotProps.data.ownerName ?? "Unassigned" }}</template>
          </TableColumn>
          <TableColumn header="Status">
            <template #body="slotProps">
              <BaseStatusPill :label="slotProps.data.status" :tone="statusTones[slotProps.data.status as CardStatus]" />
            </template>
          </TableColumn>
          <TableColumn field="assignedAt" header="Assigned">
            <template #body="slotProps">{{ slotProps.data.assignedAt ?? "—" }}</template>
          </TableColumn>
          <TableColumn field="lastScanAt" header="Last scan">
            <template #body="slotProps">{{ slotProps.data.lastScanAt ?? "—" }}</template>
          </TableColumn>
          <TableColumn header="Actions">
            <template #body="slotProps">
              <div class="inline-actions">
                <BaseButton label="Assign" text size="small" :disabled="slotProps.data.status !== 'available'" @click="openAssignDialog(slotProps.data.uid)" />
                <BaseButton label="Replace" text size="small" :disabled="slotProps.data.status === 'replaced'" @click="openReplaceDialog(slotProps.data.uid)" />
                <BaseButton label="Deactivate" text size="small" severity="danger" :disabled="slotProps.data.status === 'inactive'" @click="requestDeactivate(slotProps.data.uid)" />
              </div>
            </template>
          </TableColumn>
        </BaseTable>
      </BaseCard>
    </BaseSection>

    <BaseFormDialog
      :visible="registerVisible"
      title="Register card"
      subtitle="Add a new blank RFID card to the inventory."
      confirm-label="Register"
      :loading="cardsStore.saving"
      @update:visible="registerVisible = $event"
      @confirm="submitRegister"
      @cancel="registerVisible = false"
    >
      <label>
        <span>Card UID *</span>
        <BaseTextInput v-model="registerForm.uid" placeholder="04A1B2C3D4" />
      </label>
    </BaseFormDialog>

    <BaseFormDialog
      :visible="assignVisible"
      title="Assign card"
      :subtitle="`Assign card ${assignForm.uid} to a member.`"
      confirm-label="Assign"
      :loading="cardsStore.saving"
      @update:visible="assignVisible = $event"
      @confirm="submitAssign"
      @cancel="assignVisible = false"
    >
      <label>
        <span>Member *</span>
        <BaseSelect v-model="assignForm.ownerId" :options="memberOptions" />
      </label>
    </BaseFormDialog>

    <BaseFormDialog
      :visible="replaceVisible"
      title="Replace card"
      :subtitle="`Card ${replaceForm.oldUid} will be marked replaced and superseded by the new UID.`"
      confirm-label="Replace"
      :loading="cardsStore.saving"
      @update:visible="replaceVisible = $event"
      @confirm="submitReplace"
      @cancel="replaceVisible = false"
    >
      <label>
        <span>New card UID *</span>
        <BaseTextInput v-model="replaceForm.newUid" placeholder="04A1B2C3D4" />
      </label>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="deactivateConfirmVisible"
      title="Deactivate card"
      message="This card will stop accepting scans until reassigned or replaced."
      severity="danger"
      @update:visible="deactivateConfirmVisible = $event"
      @confirm="confirmDeactivate"
      @cancel="deactivateConfirmVisible = false"
    />
  </section>
</template>
