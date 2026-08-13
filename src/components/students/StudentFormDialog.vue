<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

import BaseDatePicker from "../base/BaseDatePicker.vue";
import BaseFormDialog from "../base/BaseFormDialog.vue";
import BaseImageUpload from "../base/BaseImageUpload.vue";
import BaseSelect from "../base/BaseSelect.vue";
import BaseTextarea from "../base/BaseTextarea.vue";
import BaseTextInput from "../base/BaseTextInput.vue";
import { isExternalSchool, OTHER_SCHOOL_VALUE, SCHOOL_NAME, SCHOOL_OPTIONS } from "../../shared/constants";
import type { MemberFormValues } from "../../types/members";

interface MemberFormOption {
  label: string;
  value: string;
}

const defaultMember: MemberFormValues = {
  photoUrl: "",
  memberNumber: "",
  fullName: "",
  email: "",
  phone: "",
  originSchool: SCHOOL_NAME,
  course: "",
  className: "",
  academicYear: "2026",
  birthDate: "",
  emergencyContact: "",
  assignedCardUid: "",
  status: "active",
  notes: "",
};

const props = withDefaults(
  defineProps<{
    visible: boolean;
    student?: Partial<MemberFormValues> | null;
    busy?: boolean;
    title?: string;
    cardOptions?: string[];
  }>(),
  {
    student: null,
    busy: false,
    title: "Member form",
    cardOptions: () => [],
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  save: [value: MemberFormValues];
  cancel: [];
}>();

const form = reactive<MemberFormValues>({ ...defaultMember });
const errors = reactive<Partial<Record<keyof MemberFormValues, string>>>({});

const statusOptions: MemberFormOption[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
  { label: "Graduated", value: "graduated" },
];

const yearOptions: MemberFormOption[] = [
  { label: "2024", value: "2024" },
  { label: "2025", value: "2025" },
  { label: "2026", value: "2026" },
  { label: "2027", value: "2027" },
];

const cardDropdownOptions = computed(() => [
  { label: "Unassigned", value: "" },
  ...props.cardOptions.map((uid) => ({ label: uid, value: uid })),
]);

/**
 * The select holds a known school or the "Other" sentinel; `form.originSchool` always
 * holds the real name. Picking "Other" reveals a free-text input for schools we have
 * not partnered with before.
 */
const schoolSelection = ref<string>(SCHOOL_NAME);
const customSchool = ref("");
const usesCustomSchool = computed(() => schoolSelection.value === OTHER_SCHOOL_VALUE);

/** Members enrolled elsewhere get their course, class and year from their own school. */
const isExternal = computed(() => isExternalSchool(form.originSchool));

watch([schoolSelection, customSchool], () => {
  form.originSchool = usesCustomSchool.value ? customSchool.value.trim() : schoolSelection.value;
});

function resetForm() {
  Object.assign(form, defaultMember, props.student ?? {});
  Object.keys(errors).forEach((key) => {
    delete errors[key as keyof MemberFormValues];
  });

  const known = SCHOOL_OPTIONS.some((option) => option.value === form.originSchool);
  schoolSelection.value = known ? form.originSchool : OTHER_SCHOOL_VALUE;
  customSchool.value = known ? "" : form.originSchool;
}

function validate() {
  let isValid = true;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const requiredFields: Array<keyof MemberFormValues> = [
    "memberNumber",
    "fullName",
    "email",
    "phone",
    "originSchool",
    "birthDate",
    "emergencyContact",
    // Academic fields are only ours to require for our own students.
    ...(isExternal.value ? [] : (["course", "className", "academicYear"] as Array<keyof MemberFormValues>)),
  ];

  for (const field of requiredFields) {
    if (!String(form[field]).trim()) {
      errors[field] = field === "originSchool" ? "Select or type the school this member is enrolled at." : "This field is required.";
      isValid = false;
    } else {
      delete errors[field];
    }
  }

  if (form.email && !emailPattern.test(form.email)) {
    errors.email = "Enter a valid email address.";
    isValid = false;
  }

  return isValid;
}

function submit() {
  if (!validate()) {
    return;
  }

  emit("save", { ...form });
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

watch(
  () => props.student,
  () => {
    if (props.visible) {
      resetForm();
    }
  },
  { deep: true },
);
</script>

<template>
  <BaseFormDialog
    :visible="visible"
    :title="title ?? 'Member form'"
    subtitle="Capture member identity, the school they are enrolled at, contact details and RFID assignment."
    confirm-label="Save"
    :loading="busy"
    @update:visible="emit('update:visible', $event)"
    @confirm="submit"
    @cancel="emit('cancel')"
  >
    <div class="student-form">
      <BaseImageUpload v-model="form.photoUrl" :label="form.fullName || 'ME'" />

      <div class="student-form__grid">
        <div>
          <label class="student-form__label">Member Number</label>
          <BaseTextInput v-model="form.memberNumber" />
          <small v-if="errors.memberNumber" class="student-form__error">{{ errors.memberNumber }}</small>
        </div>

        <div>
          <label class="student-form__label">Full Name</label>
          <BaseTextInput v-model="form.fullName" />
          <small v-if="errors.fullName" class="student-form__error">{{ errors.fullName }}</small>
        </div>

        <div>
          <label class="student-form__label">Email</label>
          <BaseTextInput v-model="form.email" type="email" />
          <small v-if="errors.email" class="student-form__error">{{ errors.email }}</small>
        </div>

        <div>
          <label class="student-form__label">Phone</label>
          <BaseTextInput v-model="form.phone" />
          <small v-if="errors.phone" class="student-form__error">{{ errors.phone }}</small>
        </div>

        <div>
          <label class="student-form__label">School</label>
          <BaseSelect v-model="schoolSelection" :options="SCHOOL_OPTIONS" />
          <small v-if="isExternal" class="student-form__hint">
            Enrolled elsewhere — an FCT intern hosted by Equipa Técnica. Their orientador belongs to that school.
          </small>
          <small v-if="errors.originSchool && !usesCustomSchool" class="student-form__error">{{ errors.originSchool }}</small>
        </div>

        <div v-if="usesCustomSchool">
          <label class="student-form__label">School name</label>
          <BaseTextInput v-model="customSchool" placeholder="Escola Secundária de…" />
          <small v-if="errors.originSchool" class="student-form__error">{{ errors.originSchool }}</small>
        </div>

        <div>
          <label class="student-form__label">Course{{ isExternal ? " (optional)" : "" }}</label>
          <BaseTextInput v-model="form.course" />
          <small v-if="errors.course" class="student-form__error">{{ errors.course }}</small>
        </div>

        <div>
          <label class="student-form__label">Class{{ isExternal ? " (optional)" : "" }}</label>
          <BaseTextInput v-model="form.className" />
          <small v-if="errors.className" class="student-form__error">{{ errors.className }}</small>
        </div>

        <div>
          <label class="student-form__label">Academic Year{{ isExternal ? " (optional)" : "" }}</label>
          <BaseSelect v-model="form.academicYear" :options="yearOptions" />
          <small v-if="errors.academicYear" class="student-form__error">{{ errors.academicYear }}</small>
        </div>

        <div>
          <label class="student-form__label">Birth Date</label>
          <BaseDatePicker v-model="form.birthDate" />
          <small v-if="errors.birthDate" class="student-form__error">{{ errors.birthDate }}</small>
        </div>

        <div>
          <label class="student-form__label">Emergency Contact</label>
          <BaseTextInput v-model="form.emergencyContact" />
          <small v-if="errors.emergencyContact" class="student-form__error">{{ errors.emergencyContact }}</small>
        </div>

        <div>
          <label class="student-form__label">Assigned Card</label>
          <BaseSelect v-model="form.assignedCardUid" :options="cardDropdownOptions" />
        </div>

        <div>
          <label class="student-form__label">Status</label>
          <BaseSelect v-model="form.status" :options="statusOptions" />
        </div>

        <div class="student-form__full-width">
          <label class="student-form__label">Notes</label>
          <BaseTextarea v-model="form.notes" rows="4" auto-resize />
        </div>
      </div>
    </div>
  </BaseFormDialog>
</template>
