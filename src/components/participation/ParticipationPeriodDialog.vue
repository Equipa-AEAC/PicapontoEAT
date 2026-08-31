<script setup lang="ts">
import { computed, reactive, watch } from "vue";

import BaseFormDialog from "../base/BaseFormDialog.vue";
import BaseSelect from "../base/BaseSelect.vue";
import BaseTextInput from "../base/BaseTextInput.vue";
import type { ParticipationPeriod, ParticipationPeriodFormValues } from "../../types/participation";
import { PARTICIPATION_KIND_OPTIONS } from "../../types/participation";
import type { InternshipSummary } from "../../types/internships";

/**
 * Record when a member's participation started and stopped.
 *
 * Deliberately small: a kind, two dates and a reason. The rules that matter —
 * no overlap, one open period, an internship period naming its internship — are
 * enforced in the service, so they hold no matter what this form does.
 */
const props = defineProps<{
  visible: boolean;
  /** Null when adding. */
  period: ParticipationPeriod | null;
  /** The member's internships, for an internship period to point at. */
  internships: InternshipSummary[];
  saving?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [values: ParticipationPeriodFormValues];
  cancel: [];
}>();

const form = reactive<ParticipationPeriodFormValues>({
  kind: "team-member",
  startDate: "",
  endDate: "",
  internshipId: "",
  note: "",
});

const internshipOptions = computed(() =>
  props.internships.map((internship) => ({
    label: `${internship.hostEntity} · ${internship.startDate} → ${internship.endDate}`,
    value: internship.id,
  })),
);

/** An internship period has to say which placement it covers. */
const needsInternship = computed(() => form.kind === "internship");

const canSubmit = computed(
  () => form.startDate !== "" && (!needsInternship.value || form.internshipId !== ""),
);

watch(
  () => [props.visible, props.period] as const,
  ([visible]) => {
    if (!visible) {
      return;
    }

    const period = props.period;

    form.kind = period?.kind ?? "team-member";
    form.startDate = period?.startDate ?? "";
    form.endDate = period?.endDate ?? "";
    form.internshipId = period?.internshipId ?? props.internships[0]?.id ?? "";
    form.note = period?.note ?? "";
  },
  { immediate: true },
);
</script>

<template>
  <BaseFormDialog
    :visible="props.visible"
    :title="props.period ? 'Edit participation period' : 'Add participation period'"
    subtitle="Both dates are inclusive and cover whole days. A day belongs entirely to the period containing it."
    :confirm-label="props.period ? 'Save period' : 'Add period'"
    :confirm-disabled="!canSubmit"
    :loading="props.saving"
    @update:visible="emit('update:visible', $event)"
    @confirm="emit('submit', { ...form })"
    @cancel="emit('cancel')"
  >
    <div class="settings-grid">
      <label>
        <span>Participation *</span>
        <BaseSelect
          :model-value="form.kind"
          :options="PARTICIPATION_KIND_OPTIONS"
          @update:model-value="form.kind = $event as ParticipationPeriodFormValues['kind']"
        />
      </label>

      <label v-if="needsInternship">
        <span>Internship *</span>
        <BaseSelect
          :model-value="form.internshipId"
          :options="internshipOptions"
          @update:model-value="form.internshipId = String($event)"
        />
        <small v-if="internshipOptions.length === 0" class="student-form__error">
          This member has no internship record yet. Assign one before recording an internship period.
        </small>
      </label>

      <label>
        <span>First day *</span>
        <BaseTextInput v-model="form.startDate" type="date" />
      </label>

      <label>
        <span>Last day</span>
        <BaseTextInput v-model="form.endDate" type="date" />
        <small class="participation-hint">Leave empty while the participation is still running.</small>
      </label>

      <label class="settings-grid__wide">
        <span>Why</span>
        <BaseTextInput v-model="form.note" placeholder="e.g. FCT placement began" />
      </label>

      <p v-if="props.errorMessage" class="settings-grid__wide form-error-banner">{{ props.errorMessage }}</p>
    </div>
  </BaseFormDialog>
</template>

<style scoped>
.participation-hint {
  color: var(--foreground-muted);
  font-size: var(--text-xs);
}
</style>
