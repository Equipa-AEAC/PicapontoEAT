<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { PhArrowClockwise, PhDeviceMobileSlash, PhSealCheck, PhWifiHigh } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseConfirmDialog,
  BaseEmptyState,
  BaseErrorState,
  BaseFilterPanel,
  BaseFormDialog,
  BaseInputNumber,
  BaseLoading,
  BaseMetricCard,
  BasePageHeader,
  BaseSection,
  BaseSelect,
  BaseStatusPill,
  BaseTextInput,
  BaseTextarea,
} from "../../../../shared/components/base";
import { useDevicesStore } from "../../../../shared/stores";
import type { DeviceFormValues } from "../../../../shared/types";
import { validateDevice } from "../../../../shared/types";
import { formatTimestamp } from "../../../../shared/utils/date";
import { t } from "../../../../i18n";
import {
  deviceStatusLabel,
  deviceStatusOptions,
  firmwareChannelLabel,
  firmwareChannelOptions,
} from "../../../../i18n/vocabulary";

/**
 * The terminal fleet.
 *
 * Two things were wrong here beyond the copy.
 *
 * **Layout.** Fleet overview sat in `.dashboard-grid`, a two-column grid, with
 * the details card as its sibling — so the list was pinned to half the page and
 * the other half was empty whenever no device was selected. It is a list of wide
 * rows and wants the width. It now owns the row, and the detail panel appears
 * beside it only once there is something to show.
 *
 * **The Add device form could not produce a working terminal.** It collected a
 * name, a location, a channel and an interval, and the service filled in
 * `0.0.0.0` for the address — a value the form never offered to change, printed
 * in a column on every row. Every terminal added through the UI was unreachable
 * by construction. The address is now part of registering one, validated as IPv4
 * and refused if another terminal already answers on it.
 */
const devicesStore = useDevicesStore();

const formVisible = ref(false);
const editingDeviceId = ref<string | null>(null);
const removeConfirmVisible = ref(false);
const pendingRemoveId = ref<string | null>(null);

const form = reactive<DeviceFormValues>({
  name: "",
  location: "",
  description: "",
  ipAddress: "",
  firmwareChannel: "stable",
  heartbeatIntervalMinutes: 5,
  notes: "",
});

const statusOptions = computed(() => [
  { label: t("common.filters.allStatuses"), value: "all" },
  ...deviceStatusOptions(),
]);

const firmwareOptions = computed(() => [
  { label: t("admin.devices.allChannels"), value: "all" },
  ...firmwareChannelOptions(),
]);

const dialogTitle = computed(() =>
  editingDeviceId.value ? t("admin.devices.edit") : t("admin.devices.add"),
);
const formProblem = computed(() => validateDevice(form));

/**
 * The list is whatever the service returned.
 *
 * The page used to re-filter these rows by query, status and channel a second
 * time in the browser, over local refs that shadowed the store filters. That
 * meant the visible list moved as you typed while the store had not been asked
 * for anything, and Reset cleared the shadows without clearing the filters the
 * store had actually been given — the selects read "All" while the list stayed
 * narrowed. `listDevices` already applies all three.
 */
const visibleDevices = computed(() => devicesStore.items);

const onlineCount = computed(() => devicesStore.items.filter((device) => device.status === "online").length);
const warningCount = computed(() => devicesStore.items.filter((device) => device.status === "warning").length);
const offlineCount = computed(() => devicesStore.items.filter((device) => device.status === "offline").length);
const queueCount = computed(() => devicesStore.items.reduce((total, device) => total + device.queueSize, 0));

const hasActiveFilters = computed(
  () =>
    devicesStore.filters.query.trim().length > 0 ||
    devicesStore.filters.status !== "all" ||
    devicesStore.filters.firmwareChannel !== "all",
);

let searchTimer: ReturnType<typeof setTimeout> | undefined;

/** Typing filters the list directly — debounced so it is one request, not one per key. */
watch(
  () => devicesStore.filters.query,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void devicesStore.loadDevices(), 250);
  },
);

watch(
  () => [devicesStore.filters.status, devicesStore.filters.firmwareChannel],
  () => {
    void devicesStore.loadDevices();
  },
);

function clearFilters() {
  devicesStore.resetFilters();
  void devicesStore.loadDevices();
}

function statusTone(status: string) {
  if (status === "online") return "success";
  if (status === "offline") return "danger";
  return "warning";
}

async function openDetails(deviceId: string) {
  await devicesStore.loadDevice(deviceId);
}

function closeDetails() {
  devicesStore.selectedDevice = null;
}

async function restartDevice(deviceId: string) {
  await devicesStore.restartDeviceAction(deviceId);
}

async function setStableChannel(deviceId: string) {
  await devicesStore.updateFirmware(deviceId, "stable");
}

function openCreateDialog() {
  devicesStore.errorMessage = null;
  editingDeviceId.value = null;
  form.name = "";
  form.location = "";
  form.description = "";
  form.ipAddress = "";
  form.firmwareChannel = "stable";
  form.heartbeatIntervalMinutes = 5;
  form.notes = "";
  formVisible.value = true;
}

function openEditDialog(deviceId: string) {
  const device = devicesStore.items.find((item) => item.id === deviceId);

  if (!device) {
    return;
  }

  devicesStore.errorMessage = null;
  editingDeviceId.value = device.id;
  form.name = device.name;
  form.location = device.location;
  form.description = device.description;
  form.ipAddress = device.ipAddress;
  form.firmwareChannel = device.firmwareChannel;
  form.heartbeatIntervalMinutes = device.heartbeatIntervalMinutes;
  form.notes = device.notes;
  formVisible.value = true;
}

async function submitForm() {
  const saved = await devicesStore.persistDevice({ ...form }, editingDeviceId.value ?? undefined);

  if (saved) {
    formVisible.value = false;
  }
}

function requestRemove(deviceId: string) {
  pendingRemoveId.value = deviceId;
  removeConfirmVisible.value = true;
}

async function confirmRemove() {
  if (pendingRemoveId.value) {
    await devicesStore.removeDevice(pendingRemoveId.value);
  }

  pendingRemoveId.value = null;
  removeConfirmVisible.value = false;
}

onMounted(async () => {
  await devicesStore.loadDevices();
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      :title="$t('admin.devices.title')"
      :description="$t('admin.devices.description')"
    >
      <template #actions>
        <BaseButton :label="$t('admin.devices.refresh')" severity="secondary" outlined :loading="devicesStore.loading" @click="devicesStore.loadDevices()" />
        <BaseButton :label="$t('admin.devices.add')" @click="openCreateDialog()" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="devicesStore.errorMessage && !formVisible"
      :message="devicesStore.errorMessage"
      @retry="devicesStore.loadDevices()"
    />

    <section class="metric-grid">
      <!--
        These count the rows in the current view, not the whole fleet: filtering
        to Offline necessarily makes "Online" read 0. The captions say so rather
        than claiming a fleet-wide number the filter has already excluded.
      -->
      <BaseMetricCard :label="$t('admin.devices.metricOnline')" :value="String(onlineCount)" :caption="$t('admin.devices.metricOnlineCaption')" :icon="PhWifiHigh" />
      <BaseMetricCard
        :label="$t('admin.devices.metricWarnings')"
        :value="String(warningCount)"
        :caption="$t('admin.devices.metricWarningsCaption')"
        :icon="PhSealCheck"
        :trend-label="warningCount > 0 ? $t('admin.devices.needsReview') : $t('admin.devices.allClear')"
        :trend-tone="warningCount > 0 ? 'negative' : 'positive'"
      />
      <BaseMetricCard
        :label="$t('admin.devices.metricOffline')"
        :value="String(offlineCount)"
        :caption="$t('admin.devices.metricOfflineCaption')"
        :icon="PhDeviceMobileSlash"
        :trend-label="offlineCount > 0 ? $t('admin.devices.needsRecovery') : $t('admin.devices.allReporting')"
        :trend-tone="offlineCount > 0 ? 'negative' : 'positive'"
      />
      <BaseMetricCard :label="$t('admin.devices.metricQueue')" :value="String(queueCount)" :caption="$t('admin.devices.metricQueueCaption')" :icon="PhArrowClockwise" />
    </section>

    <BaseFilterPanel :title="$t('admin.devices.filtersTitle')" :description="$t('admin.devices.filtersDescription')">
      <div class="filter-strip">
        <BaseTextInput v-model="devicesStore.filters.query" :placeholder="$t('admin.devices.search')" />
        <BaseSelect v-model="devicesStore.filters.status" :options="statusOptions" />
        <BaseSelect v-model="devicesStore.filters.firmwareChannel" :options="firmwareOptions" />
        <BaseButton :label="$t('common.actions.clearFilters')" severity="secondary" outlined :disabled="!hasActiveFilters" @click="clearFilters" />
      </div>
    </BaseFilterPanel>

    <BaseLoading v-if="devicesStore.loading" />

    <!--
      One column when nothing is selected, two when a device is open. The fleet is
      a list of wide rows; pinning it to half the page left the other half blank.
    -->
    <BaseSection v-else :title="$t('admin.devices.tableTitle')" :description="$t('admin.devices.tableDescription')">
      <div class="fleet-layout" :class="{ 'fleet-layout--with-details': Boolean(devicesStore.selectedDevice) }">
        <BaseCard>
          <BaseEmptyState
            v-if="visibleDevices.length === 0"
            :title="$t('admin.devices.emptyTitle')"
            :description="
              hasActiveFilters
                ? $t('admin.devices.emptyFiltered')
                : $t('admin.devices.emptyNone')
            "
            :action-label="hasActiveFilters ? $t('common.actions.clearFilters') : $t('admin.devices.add')"
            @action="hasActiveFilters ? clearFilters() : openCreateDialog()"
          />

          <article
            v-for="device in visibleDevices"
            :key="device.id"
            class="device-row"
            :class="{ 'device-row--selected': devicesStore.selectedDevice?.id === device.id }"
          >
            <div class="device-row__identity">
              <strong>{{ device.name }}</strong>
              <p class="type-meta">
                {{
                  $t("admin.devices.identityLine", {
                    location: device.location,
                    ip: device.ipAddress,
                    version: device.firmwareVersion,
                    channel: firmwareChannelLabel(device.firmwareChannel),
                  })
                }}
              </p>
              <p class="type-meta">
                {{
                  $t("admin.devices.queueLine", {
                    queue: device.queueSize,
                    when: formatTimestamp(device.lastHeartbeatAt),
                  })
                }}
              </p>
            </div>

            <BaseStatusPill :label="deviceStatusLabel(device.status)" :tone="statusTone(device.status)" />

            <div class="inline-actions device-row__actions">
              <BaseButton :label="$t('admin.devices.details')" severity="secondary" text size="small" @click="openDetails(device.id)" />
              <BaseButton :label="$t('common.actions.edit')" severity="secondary" text size="small" @click="openEditDialog(device.id)" />
              <BaseButton :label="$t('admin.devices.restart')" severity="secondary" text size="small" @click="restartDevice(device.id)" />
              <BaseButton
                v-if="device.firmwareChannel !== 'stable'"
                :label="$t('admin.devices.setStable')"
                severity="secondary"
                text
                size="small"
                @click="setStableChannel(device.id)"
              />
              <BaseButton :label="$t('common.actions.remove')" severity="danger" text size="small" @click="requestRemove(device.id)" />
            </div>
          </article>
        </BaseCard>

        <BaseCard
          v-if="devicesStore.selectedDevice"
          :title="$t('admin.devices.detailsTitle')"
          :description="$t('admin.devices.detailsDescription')"
        >
          <template #header>
            <BaseStatusPill
              :label="deviceStatusLabel(devicesStore.selectedDevice.status)"
              :tone="statusTone(devicesStore.selectedDevice.status)"
            />
          </template>

          <dl class="fact-list">
            <div class="fact-list__row">
              <dt class="type-label">{{ $t("common.fields.location") }}</dt>
              <dd>{{ devicesStore.selectedDevice.location }}</dd>
            </div>
            <div class="fact-list__row">
              <dt class="type-label">{{ $t("admin.devices.ipAddress") }}</dt>
              <dd class="type-numeric">{{ devicesStore.selectedDevice.ipAddress }}</dd>
            </div>
            <div class="fact-list__row">
              <dt class="type-label">{{ $t("admin.devices.firmware") }}</dt>
              <dd>
                {{ devicesStore.selectedDevice.firmwareVersion }}
                ({{ firmwareChannelLabel(devicesStore.selectedDevice.firmwareChannel) }})
              </dd>
            </div>
            <div class="fact-list__row">
              <dt class="type-label">{{ $t("admin.devices.heartbeat") }}</dt>
              <dd>
                {{ formatTimestamp(devicesStore.selectedDevice.lastHeartbeatAt) }}
                <span class="type-meta">
                  {{
                    $t("admin.devices.heartbeatEvery", {
                      minutes: devicesStore.selectedDevice.heartbeatIntervalMinutes,
                    })
                  }}
                </span>
              </dd>
            </div>
            <div class="fact-list__row">
              <dt class="type-label">{{ $t("admin.devices.queue") }}</dt>
              <dd>{{ $t("admin.devices.pendingScans", { count: devicesStore.selectedDevice.queueSize }) }}</dd>
            </div>
            <div class="fact-list__row">
              <dt class="type-label">{{ $t("common.fields.notes") }}</dt>
              <dd>{{ devicesStore.selectedDevice.notes || $t("common.state.noneRecorded") }}</dd>
            </div>
          </dl>

          <template #footer>
            <BaseButton :label="$t('common.actions.close')" severity="secondary" text @click="closeDetails" />
            <BaseButton :label="$t('admin.devices.editDevice')" severity="secondary" outlined @click="openEditDialog(devicesStore.selectedDevice.id)" />
          </template>
        </BaseCard>
      </div>
    </BaseSection>

    <BaseFormDialog
      :visible="formVisible"
      :title="dialogTitle"
      :subtitle="$t('admin.devices.formSubtitle')"
      :confirm-label="$t('admin.devices.save')"
      :cancel-label="$t('common.actions.cancel')"
      :loading="devicesStore.saving"
      :confirm-disabled="formProblem !== null"
      @update:visible="formVisible = $event"
      @confirm="submitForm"
      @cancel="formVisible = false"
    >
      <p v-if="devicesStore.errorMessage" class="form-error-banner">{{ devicesStore.errorMessage }}</p>

      <div class="settings-grid">
        <label>
          <span>{{ $t("admin.devices.fieldName") }}</span>
          <BaseTextInput v-model="form.name" :placeholder="$t('admin.devices.namePlaceholder')" />
        </label>
        <label>
          <span>{{ $t("admin.devices.fieldLocation") }}</span>
          <BaseTextInput v-model="form.location" :placeholder="$t('admin.devices.locationPlaceholder')" />
        </label>
        <label>
          <span>{{ $t("admin.devices.fieldIpRequired") }}</span>
          <BaseTextInput v-model="form.ipAddress" placeholder="192.168.10.42" />
          <small class="student-form__hint">{{ $t("admin.devices.ipHint") }}</small>
        </label>
        <label>
          <span>{{ $t("admin.devices.fieldHeartbeat") }}</span>
          <BaseInputNumber v-model="form.heartbeatIntervalMinutes" :min="1" />
        </label>
        <label>
          <span>{{ $t("admin.devices.fieldChannel") }}</span>
          <BaseSelect v-model="form.firmwareChannel" :options="firmwareChannelOptions()" />
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("common.fields.description") }}</span>
          <BaseTextarea v-model="form.description" rows="2" auto-resize />
        </label>
        <label class="settings-grid__wide">
          <span>{{ $t("common.fields.notes") }}</span>
          <BaseTextarea v-model="form.notes" rows="2" auto-resize />
        </label>
      </div>

      <p v-if="formProblem" class="type-meta">{{ formProblem }}</p>
      <p v-else-if="!editingDeviceId" class="type-meta">
        {{ $t("admin.devices.offlineUntilHeartbeat") }}
      </p>
    </BaseFormDialog>

    <BaseConfirmDialog
      :visible="removeConfirmVisible"
      :title="$t('admin.devices.removeTitle')"
      :message="$t('admin.devices.removeMessage')"
      :confirm-label="$t('common.actions.remove')"
      :cancel-label="$t('common.actions.cancel')"
      severity="danger"
      @update:visible="removeConfirmVisible = $event"
      @confirm="confirmRemove"
      @cancel="removeConfirmVisible = false"
    />
  </section>
</template>

<style scoped>
/*
 * Full width by default; the detail panel claims a column only when open. The
 * previous layout was a permanent two-column grid, so the fleet was squeezed
 * into half the page whether or not anything sat next to it.
 */
.fleet-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.fleet-layout--with-details {
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
}

.device-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.device-row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.device-row--selected {
  /* A selected row has to be findable again after the panel opens beside it. */
  box-shadow: inset 3px 0 0 var(--primary);
  padding-left: var(--space-3);
}

.device-row__identity {
  min-width: 0;
}

.device-row__identity strong {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.device-row__identity p {
  margin: 1px 0 0;
}

.device-row__actions {
  justify-self: end;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.fact-list {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.fact-list__row {
  display: grid;
  grid-template-columns: minmax(90px, 130px) minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.fact-list__row:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.fact-list__row dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--foreground);
}

@media (max-width: 1080px) {
  .fleet-layout--with-details {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .device-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .device-row__actions {
    grid-column: 1 / -1;
    justify-self: start;
    justify-content: flex-start;
  }
}
</style>
