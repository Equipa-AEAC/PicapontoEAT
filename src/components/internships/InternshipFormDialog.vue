<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { t } from "../../i18n";

import BaseFormDialog from "../base/BaseFormDialog.vue";
import BaseInputNumber from "../base/BaseInputNumber.vue";
import BaseSelect from "../base/BaseSelect.vue";
import BaseStatusPill from "../base/BaseStatusPill.vue";
import BaseTextInput from "../base/BaseTextInput.vue";
import { INTERNSHIP_HOST_ENTITY } from "../../shared/constants";
import type { InternshipFormValues } from "../../types/internships";
import type { MemberSummary } from "../../types/members";
import { internshipStatusOptions } from "../../i18n/vocabulary";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** Members that can still be assigned an internship. */
    members: MemberSummary[];
    /** Pre-selects a member — used by the create-member handoff. */
    memberId?: string | null;
    busy?: boolean;
    errorMessage?: string | null;
  }>(),
  {
    memberId: null,
    busy: false,
    errorMessage: null,
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  save: [value: InternshipFormValues];
  cancel: [];
}>();

const DEFAULT_REQUIRED_HOURS = 240;

const statusOptions = computed(() => internshipStatusOptions());

const form = reactive<InternshipFormValues>({
  studentId: "",
  requiredHours: DEFAULT_REQUIRED_HOURS,
  orientador: "",
  monitor: "",
  startDate: "",
  endDate: "",
  status: "planned",
  notes: "",
});

const errors = reactive<Partial<Record<keyof InternshipFormValues, string>>>({});

const memberOptions = computed(() =>
  props.members.map((member) => ({ label: `${member.fullName} • ${member.memberNumber}`, value: member.id })),
);

const selectedMember = computed(() => props.members.find((member) => member.id === form.studentId) ?? null);

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key as keyof InternshipFormValues]);
}

function resetForm() {
  form.studentId = props.memberId ?? memberOptions.value[0]?.value ?? "";
  form.requiredHours = DEFAULT_REQUIRED_HOURS;
  form.orientador = "";
  form.monitor = "";
  form.startDate = "";
  form.endDate = "";
  form.status = "planned";
  form.notes = "";
  clearErrors();
}

function requireField(field: keyof InternshipFormValues, message: string) {
  if (!String(form[field]).trim()) {
    errors[field] = message;
    return false;
  }

  delete errors[field];
  return true;
}

function validate() {
  const checks = [
    requireField("studentId", t("errors.selectMember")),
    requireField("orientador", t("errors.orientadorRequired")),
    requireField("monitor", t("errors.monitorRequired")),
    requireField("startDate", t("errors.startDateRequired")),
    requireField("endDate", t("errors.endDateRequired")),
  ];

  if (form.requiredHours <= 0) {
    errors.requiredHours = t("errors.requiredHoursPositive");
    checks.push(false);
  } else {
    delete errors.requiredHours;
  }

  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = t("errors.endBeforeStart");
    checks.push(false);
  }

  return checks.every(Boolean);
}

function submit() {
  if (validate()) {
    emit("save", { ...form });
  }
}

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="$t('components.internshipForm.title')"
    :subtitle="$t('components.internshipForm.subtitle', { host: INTERNSHIP_HOST_ENTITY })"
    :confirm-label="$t('components.internshipForm.confirm')"
    :cancel-label="$t('common.actions.cancel')"
    :loading="busy"
    @update:visible="emit('update:visible', $event)"
    @confirm="submit"
    @cancel="emit('cancel')"
  >
    <p v-if="errorMessage" class="form-error-banner">{{ errorMessage }}</p>

    <div class="settings-grid">
      <label class="settings-grid__wide">
        <span>{{ $t("components.internshipForm.member") }}</span>
        <BaseSelect v-model="form.studentId" :options="memberOptions" :placeholder="$t('components.internshipForm.pickMember')" />
        <small v-if="errors.studentId" class="student-form__error">{{ errors.studentId }}</small>
      </label>

      <div v-if="selectedMember?.isExternal" class="settings-grid__wide internship-form__origin">
        <BaseStatusPill :label="$t('components.internshipForm.external')" tone="warning" />
        <i18n-t keypath="components.internshipForm.enrolledAtNote" tag="span">
          <template #school>
            <strong>{{ selectedMember.originSchool }}</strong>
          </template>
        </i18n-t>
      </div>

      <label>
        <span>{{ $t("components.internshipForm.requiredHours") }}</span>
        <BaseInputNumber v-model="form.requiredHours" :min="1" />
        <small v-if="errors.requiredHours" class="student-form__error">{{ errors.requiredHours }}</small>
      </label>
      <label>
        <span>{{ $t("components.internshipForm.status") }}</span>
        <BaseSelect v-model="form.status" :options="statusOptions" />
      </label>

      <label>
        <span>{{ $t("components.internshipForm.orientador") }}</span>
        <BaseTextInput v-model="form.orientador" :placeholder="$t('components.internshipForm.orientadorPlaceholder')" />
        <small class="student-form__hint">{{ $t("components.internshipForm.orientadorHint") }}</small>
        <small v-if="errors.orientador" class="student-form__error">{{ errors.orientador }}</small>
      </label>
      <label>
        <span>{{ $t("components.internshipForm.monitor") }}</span>
        <BaseTextInput v-model="form.monitor" :placeholder="$t('components.internshipForm.monitorPlaceholder')" />
        <small class="student-form__hint">{{ $t("components.internshipForm.monitorHint") }}</small>
        <small v-if="errors.monitor" class="student-form__error">{{ errors.monitor }}</small>
      </label>

      <label>
        <span>{{ $t("components.internshipForm.startDate") }}</span>
        <BaseTextInput v-model="form.startDate" placeholder="YYYY-MM-DD" />
        <small v-if="errors.startDate" class="student-form__error">{{ errors.startDate }}</small>
      </label>
      <label>
        <span>{{ $t("components.internshipForm.endDate") }}</span>
        <BaseTextInput v-model="form.endDate" placeholder="YYYY-MM-DD" />
        <small v-if="errors.endDate" class="student-form__error">{{ errors.endDate }}</small>
      </label>

      <label class="settings-grid__wide">
        <span>{{ $t("common.fields.notes") }}</span>
        <BaseTextInput v-model="form.notes" />
      </label>
    </div>
  </BaseFormDialog>
</template>

<style scoped>
.internship-form__origin {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface-subtle);
  color: var(--foreground-secondary);
  font-size: 0.85rem;
}

.internship-form__origin strong {
  color: var(--foreground);
}
</style>
