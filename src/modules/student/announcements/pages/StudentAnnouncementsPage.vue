<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhCheck, PhEnvelopeSimple } from "@phosphor-icons/vue";

import {
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseErrorState,
  BaseLoading,
  BasePageHeader,
  BaseSearchBar,
  BaseStatusPill,
} from "../../../../shared/components/base";
import { useAnnouncementsStore, useInternshipsStore } from "../../../../shared/stores";
import { ANNOUNCEMENT_PRIORITY_LABELS } from "../../../../types/announcements";
import type { AnnouncementPriority, MemberAnnouncement } from "../../../../types/announcements";
import { PLACEMENT_PROGRAM_LABELS } from "../../../../types/placements";
import type { PlacementProgram } from "../../../../types/placements";
import { useAuthStore } from "../../../../modules/authentication";
import { formatIsoDate, formatRelativeTime } from "../../../../shared/utils/date";

/**
 * Notices addressed to this member.
 *
 * These are messages, not records, and they were being rendered as a data table
 * with the message squeezed into a column — which truncated the one part that
 * mattered. This is a reading list: the full text is there, unread notices are
 * marked, and opening one marks it read.
 */
const authStore = useAuthStore();
const announcementsStore = useAnnouncementsStore();
const internshipsStore = useInternshipsStore();

/**
 * The member whose data this page shows, resolved from the session.
 *
 * Falls back to an empty id rather than a hardcoded member: an empty id matches
 * nobody, so a session without a member sees nothing instead of somebody else's
 * records. This is a safe *default*, not authorization — see the note on
 * `authStore.currentMemberId`.
 */
const memberId = computed(() => authStore.currentMemberId ?? "");
const searchQuery = ref("");
const openIds = ref<Set<string>>(new Set());

const priorityTones: Record<AnnouncementPriority, "info" | "warning" | "danger"> = {
  normal: "info",
  important: "warning",
  urgent: "danger",
};

/**
 * Every member is a volunteer on the surplus-hours track; holding an internship record
 * additionally puts them on the official FCT track for announcement targeting.
 */
const memberProgram = computed<PlacementProgram>(() =>
  internshipsStore.selectedInternship ? "official-internship" : "equipa-hours",
);

const announcements = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return announcementsStore.mine.filter(
    (announcement) =>
      query.length === 0 || [announcement.title, announcement.body].join(" ").toLowerCase().includes(query),
  );
});

const unread = computed(() => announcements.value.filter((announcement) => announcement.readAt === null));

function isOpen(announcement: MemberAnnouncement) {
  return openIds.value.has(announcement.id);
}

/**
 * Expanding or collapsing a notice both count as having read it.
 *
 * Unread notices start expanded so the text is there without a click, which
 * means "expanded" cannot by itself mean "read" — the member has to act. Either
 * action does it, as does the Mark all read button.
 */
async function toggle(announcement: MemberAnnouncement) {
  const next = new Set(openIds.value);

  if (next.has(announcement.id)) {
    next.delete(announcement.id);
  } else {
    next.add(announcement.id);
  }

  openIds.value = next;
  await announcementsStore.markRead(memberId.value, announcement.id);
}

async function markAllRead() {
  for (const announcement of unread.value) {
    await announcementsStore.markRead(memberId.value, announcement.id);
  }
}

async function refresh() {
  await announcementsStore.loadForMember(memberId.value, memberProgram.value);
}

onMounted(async () => {
  await internshipsStore.loadInternship(memberId.value);
  await refresh();

  // Anything still unread starts expanded: the point of the page is reading it.
  openIds.value = new Set(announcementsStore.mine.filter((item) => item.readAt === null).map((item) => item.id));
});
</script>

<template>
  <section class="page-stack">
    <BasePageHeader
      title="Announcements"
      description="Notices for everyone, plus the ones addressed to your participation track."
    >
      <template #actions>
        <BaseButton
          v-if="unread.length > 0"
          label="Mark all read"
          severity="secondary"
          outlined
          @click="markAllRead"
        />
        <BaseButton label="Refresh" severity="secondary" outlined :loading="announcementsStore.loading" @click="refresh()" />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="announcementsStore.errorMessage"
      :message="announcementsStore.errorMessage"
      @retry="refresh"
    />

    <div class="notice-bar">
      <BaseSearchBar v-model="searchQuery" placeholder="Search announcements" />
      <div class="notice-bar__meta">
        <BaseStatusPill :label="PLACEMENT_PROGRAM_LABELS[memberProgram]" tone="info" />
        <BaseStatusPill
          v-if="unread.length > 0"
          :label="`${unread.length} unread`"
          tone="warning"
        />
      </div>
    </div>

    <BaseLoading v-if="announcementsStore.loading && announcements.length === 0" />

    <BaseCard v-else>
      <BaseEmptyState
        v-if="announcements.length === 0"
        title="Nothing to read"
        :description="
          searchQuery
            ? 'No announcement matches what you searched for.'
            : 'Notices from the coordination team will appear here.'
        "
      />

      <ul v-else class="notice-list">
        <li
          v-for="announcement in announcements"
          :key="announcement.id"
          class="notice"
          :class="{ 'notice--unread': announcement.readAt === null }"
        >
          <button
            type="button"
            class="notice__head"
            :aria-expanded="isOpen(announcement)"
            @click="toggle(announcement)"
          >
            <span class="notice__title-row">
              <span v-if="announcement.readAt === null" class="notice__dot" aria-label="Unread" />
              <span class="notice__title">{{ announcement.title }}</span>
            </span>

            <span class="notice__meta type-meta">
              <BaseStatusPill
                v-if="announcement.priority !== 'normal'"
                :label="ANNOUNCEMENT_PRIORITY_LABELS[announcement.priority]"
                :tone="priorityTones[announcement.priority]"
              />
              <span>{{ formatIsoDate(announcement.publishedAt) }}</span>
            </span>
          </button>

          <div v-if="isOpen(announcement)" class="notice__body">
            <p class="notice__text">{{ announcement.body }}</p>
            <p class="type-meta notice__footer">
              <template v-if="announcement.readAt">
                <PhCheck weight="bold" />
                Read {{ formatRelativeTime(announcement.readAt) }}
              </template>
              <template v-else>
                <PhEnvelopeSimple weight="regular" />
                Unread &mdash; collapse this notice, or use “Mark all read”, once you have seen it.
              </template>
            </p>
          </div>
        </li>
      </ul>
    </BaseCard>
  </section>
</template>

<style scoped>
.notice-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.notice-bar__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.notice-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notice:not(:last-child) {
  border-bottom: var(--border-width) solid var(--border-subtle);
}

/* Unread reads as a state, not as a heavier font. */
.notice--unread {
  margin-left: calc(var(--space-3) * -1);
  padding-left: var(--space-3);
  border-left: 2px solid var(--primary);
}

.notice__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
  padding: var(--space-3) 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.notice__title-row {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  min-width: 0;
}

.notice__dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: var(--radius-pill);
  background: var(--primary);
}

.notice__title {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--foreground);
}

.notice--unread .notice__title {
  font-weight: var(--weight-semibold);
}

.notice__head:hover .notice__title {
  color: var(--primary);
}

.notice__meta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
  white-space: nowrap;
}

.notice__body {
  padding: 0 0 var(--space-4) var(--space-4);
  max-width: 70ch;
}

.notice__text {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--foreground-secondary);
}

.notice__footer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin: var(--space-3) 0 0;
}

.notice__footer svg {
  width: 13px;
  height: 13px;
}

@media (max-width: 640px) {
  .notice__head {
    flex-direction: column;
    gap: var(--space-1);
  }
}
</style>
