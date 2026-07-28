<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Textarea from "primevue/textarea";

import BaseAvatar from "../base/BaseAvatar.vue";
import BaseFormDialog from "../base/BaseFormDialog.vue";
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

const birthDateModel = computed<Date | null>({
  get() {
    return form.birthDate ? new Date(form.birthDate) : null;
  },
  set(value) {
    form.birthDate = value ? value.toISOString().slice(0, 10) : "";
  },
});

function resetForm() {
  Object.assign(form, defaultMember, props.student ?? {});
  Object.keys(errors).forEach((key) => {
    delete errors[key as keyof MemberFormValues];
  });
}

function validate() {
  let isValid = true;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const requiredFields: Array<keyof MemberFormValues> = [
    "memberNumber",
    "fullName",
    "email",
    "phone",
    "course",
    "className",
    "academicYear",
    "birthDate",
    "emergencyContact",
  ];

  for (const field of requiredFields) {
    if (!String(form[field]).trim()) {
      errors[field] = "This field is required.";
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
    subtitle="Capture member identity, contact details, academic class and RFID assignment."
    confirm-label="Save"
    :loading="busy"
    @update:visible="emit('update:visible', $event)"
    @confirm="submit"
    @cancel="emit('cancel')"
  >
    <div class="student-form">
      <div class="student-form__photo">
        <BaseAvatar :image="form.photoUrl || null" :label="form.fullName || 'ME'" size="xlarge" />
        <InputText v-model="form.photoUrl" placeholder="Photo URL" />
      </div>

      <div class="student-form__grid">
        <div>
          <label class="student-form__label">Member Number</label>
          <InputText v-model="form.memberNumber" />
          <small v-if="errors.memberNumber" class="student-form__error">{{ errors.memberNumber }}</small>
        </div>

        <div>
          <label class="student-form__label">Full Name</label>
          <InputText v-model="form.fullName" />
          <small v-if="errors.fullName" class="student-form__error">{{ errors.fullName }}</small>
        </div>

        <div>
          <label class="student-form__label">Email</label>
          <InputText v-model="form.email" type="email" />
          <small v-if="errors.email" class="student-form__error">{{ errors.email }}</small>
        </div>

        <div>
          <label class="student-form__label">Phone</label>
          <InputText v-model="form.phone" />
          <small v-if="errors.phone" class="student-form__error">{{ errors.phone }}</small>
        </div>

        <div>
          <label class="student-form__label">Course</label>
          <InputText v-model="form.course" />
          <small v-if="errors.course" class="student-form__error">{{ errors.course }}</small>
        </div>

        <div>
          <label class="student-form__label">Class</label>
          <InputText v-model="form.className" />
          <small v-if="errors.className" class="student-form__error">{{ errors.className }}</small>
        </div>

        <div>
          <label class="student-form__label">Academic Year</label>
          <Select v-model="form.academicYear" :options="yearOptions" optionLabel="label" optionValue="value" />
          <small v-if="errors.academicYear" class="student-form__error">{{ errors.academicYear }}</small>
        </div>

        <div>
          <label class="student-form__label">Birth Date</label>
          <DatePicker v-model="birthDateModel" dateFormat="yy-mm-dd" showIcon />
          <small v-if="errors.birthDate" class="student-form__error">{{ errors.birthDate }}</small>
        </div>

        <div>
          <label class="student-form__label">Emergency Contact</label>
          <InputText v-model="form.emergencyContact" />
          <small v-if="errors.emergencyContact" class="student-form__error">{{ errors.emergencyContact }}</small>
        </div>

        <div>
          <label class="student-form__label">Assigned Card</label>
          <Select v-model="form.assignedCardUid" :options="cardDropdownOptions" optionLabel="label" optionValue="value" />
        </div>

        <div>
          <label class="student-form__label">Status</label>
          <Select v-model="form.status" :options="statusOptions" optionLabel="label" optionValue="value" />
        </div>

        <div class="student-form__full-width">
          <label class="student-form__label">Notes</label>
          <Textarea v-model="form.notes" rows="4" autoResize />
        </div>
      </div>
    </div>
  </BaseFormDialog>
</template>
