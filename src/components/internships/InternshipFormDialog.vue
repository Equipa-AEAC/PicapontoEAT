<script setup lang="ts">
import { computed, reactive, watch } from "vue";

import BaseFormDialog from "../base/BaseFormDialog.vue";
import BaseInputNumber from "../base/BaseInputNumber.vue";
import BaseSelect from "../base/BaseSelect.vue";
import BaseStatusPill from "../base/BaseStatusPill.vue";
import BaseTextInput from "../base/BaseTextInput.vue";
import { INTERNSHIP_HOST_ENTITY } from "../../shared/constants";
import type { InternshipFormValues } from "../../types/internships";
import type { MemberSummary } from "../../types/members";

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

const statusOptions = [
  { label: "Planned", value: "planned" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Complete", value: "complete" },
];

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
    requireField("studentId", "Select a team member."),
    requireField("orientador", "The orientador de estágio is required."),
    requireField("monitor", "The official document set requires a monitor de estágio."),
    requireField("startDate", "Start date is required."),
    requireField("endDate", "End date is required."),
  ];

  if (form.requiredHours <= 0) {
    errors.requiredHours = "Required hours must be greater than zero.";
    checks.push(false);
  } else {
    delete errors.requiredHours;
  }

  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = "The end date cannot be before the start date.";
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
    title="Assign internship"
    :subtitle="`The internship is hosted at ${INTERNSHIP_HOST_ENTITY}, since Equipa Técnica runs inside the school.`"
    confirm-label="Assign"
    :loading="busy"
    @update:visible="emit('update:visible', $event)"
    @confirm="submit"
    @cancel="emit('cancel')"
  >
    <p v-if="errorMessage" class="form-error-banner">{{ errorMessage }}</p>

    <div class="settings-grid">
      <label class="settings-grid__wide">
        <span>Team member *</span>
        <BaseSelect v-model="form.studentId" :options="memberOptions" placeholder="Select a team member" />
        <small v-if="errors.studentId" class="student-form__error">{{ errors.studentId }}</small>
      </label>

      <div v-if="selectedMember?.isExternal" class="settings-grid__wide internship-form__origin">
        <BaseStatusPill label="External intern" tone="warning" />
        <span>Enrolled at <strong>{{ selectedMember.originSchool }}</strong> — the orientador below belongs to that school.</span>
      </div>

      <label>
        <span>Required hours *</span>
        <BaseInputNumber v-model="form.requiredHours" :min="1" />
        <small v-if="errors.requiredHours" class="student-form__error">{{ errors.requiredHours }}</small>
      </label>
      <label>
        <span>Status *</span>
        <BaseSelect v-model="form.status" :options="statusOptions" />
      </label>

      <label>
        <span>Orientador de Estágio *</span>
        <BaseTextInput v-model="form.orientador" placeholder="Prof. …" />
        <small class="student-form__hint">Teacher responsible at the school the intern is enrolled at.</small>
        <small v-if="errors.orientador" class="student-form__error">{{ errors.orientador }}</small>
      </label>
      <label>
        <span>Monitor de Estágio *</span>
        <BaseTextInput v-model="form.monitor" placeholder="Eng. …" />
        <small class="student-form__hint">Equipa Técnica person supervising the intern day to day.</small>
        <small v-if="errors.monitor" class="student-form__error">{{ errors.monitor }}</small>
      </label>

      <label>
        <span>Start date *</span>
        <BaseTextInput v-model="form.startDate" placeholder="YYYY-MM-DD" />
        <small v-if="errors.startDate" class="student-form__error">{{ errors.startDate }}</small>
      </label>
      <label>
        <span>End date *</span>
        <BaseTextInput v-model="form.endDate" placeholder="YYYY-MM-DD" />
        <small v-if="errors.endDate" class="student-form__error">{{ errors.endDate }}</small>
      </label>

      <label class="settings-grid__wide">
        <span>Notes</span>
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
  border: 1px solid var(--surface-border);
  background: var(--surface-soft);
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.internship-form__origin strong {
  color: var(--text-primary);
}
</style>
