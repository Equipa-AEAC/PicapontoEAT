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
import type { AnnouncementPriority, MemberAnnouncement } from "../../../../types/announcements";

import type { PlacementProgram } from "../../../../types/placements";
import { useAuthStore } from "../../../../modules/authentication";
import { formatIsoDate, formatRelativeTime } from "../../../../shared/utils/date";
import { announcementPriorityLabel, programLabel } from "../../../../i18n/vocabulary";

/**
 * Notices addressed to this member.
 *
 * These are messages, not records, and they were being rendered as a data table
 * with the message squeezed into a column — which truncated the one part that
 * mattered. This is a reading list: the full text is there and unread notices
 * are marked.
 *
 * **Marking read is one notice at a time, and always deliberate.** Expanding or
 * collapsing used to do it silently, and the only explicit control was a
 * "Mark all read" button — so a member who opened the page to check one notice
 * had the rest marked for them, or had to clear the lot. Reading and marking are
 * now separate: the text opens on click, and "Mark as read" is a button on the
 * notice it applies to.
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
 * Expanding and collapsing only change what is on screen.
 *
 * They deliberately do not mark anything: unread notices start expanded so the
 * text is there without a click, which means "expanded" cannot mean "read", and
 * a member scrolling past a notice has not read it.
 */
function toggle(announcement: MemberAnnouncement) {
  const next = new Set(openIds.value);

  if (next.has(announcement.id)) {
    next.delete(announcement.id);
  } else {
    next.add(announcement.id);
  }

  openIds.value = next;
}

/** One notice, marked because the member said so. */
async function markRead(announcement: MemberAnnouncement) {
  await announcementsStore.markRead(memberId.value, announcement.id);
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
      :title="$t('student.announcements.title')"
      :description="$t('student.announcements.description')"
    >
      <template #actions>
        <BaseButton
          :label="$t('common.actions.refresh')"
          severity="secondary"
          outlined
          :loading="announcementsStore.loading"
          @click="refresh()"
        />
      </template>
    </BasePageHeader>

    <BaseErrorState
      v-if="announcementsStore.errorMessage"
      :message="announcementsStore.errorMessage"
      @retry="refresh"
    />

    <div class="notice-bar">
      <BaseSearchBar v-model="searchQuery" :placeholder="$t('student.announcements.search')" />
      <div class="notice-bar__meta">
        <BaseStatusPill :label="programLabel(memberProgram)" tone="info" />
        <BaseStatusPill
          v-if="unread.length > 0"
          :label="$t('student.announcements.unreadCount', { count: unread.length })"
          tone="warning"
        />
      </div>
    </div>

    <BaseLoading v-if="announcementsStore.loading && announcements.length === 0" />

    <BaseCard v-else>
      <BaseEmptyState
        v-if="announcements.length === 0"
        :title="$t('student.announcements.emptyTitle')"
        :description="
          searchQuery
            ? $t('student.announcements.emptySearch')
            : $t('student.announcements.emptyDescription')
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
              <span
                v-if="announcement.readAt === null"
                class="notice__dot"
                :aria-label="$t('student.announcements.unread')"
              />
              <span class="notice__title">{{ announcement.title }}</span>
            </span>

            <span class="notice__meta type-meta">
              <BaseStatusPill
                v-if="announcement.priority !== 'normal'"
                :label="announcementPriorityLabel(announcement.priority)"
                :tone="priorityTones[announcement.priority]"
              />
              <span>{{ formatIsoDate(announcement.publishedAt) }}</span>
            </span>
          </button>

          <div v-if="isOpen(announcement)" class="notice__body">
            <p class="notice__text">{{ announcement.body }}</p>
            <div class="notice__actions">
              <p class="type-meta notice__footer">
                <template v-if="announcement.readAt">
                  <PhCheck weight="bold" />
                  {{ $t("student.announcements.read", { time: formatRelativeTime(announcement.readAt) }) }}
                </template>
                <template v-else>
                  <PhEnvelopeSimple weight="regular" />
                  {{ $t("student.announcements.unread") }}
                </template>
              </p>

              <!-- One notice, marked because the member pressed this. -->
              <BaseButton
                v-if="announcement.readAt === null"
:label="$t('common.actions.markRead')"
                severity="secondary"
                outlined
                size="small"
                @click="markRead(announcement)"
              />
            </div>
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

.notice__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-top: var(--space-3);
}

.notice__footer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
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
