<script lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType, type VNode } from "vue";
import TableColumnDef from "./TableColumn.vue";
import { t } from "../../i18n";

interface ColumnDef {
  field?: string;
  header?: string;
  sortable: boolean;
  sortField?: string;
  width?: string;
  isSelectionMarker: boolean;
  bodySlot?: (ctx: { data: unknown; index: number }) => VNode[] | VNode | string;
}

export default defineComponent({
  name: "BaseTable",
  props: {
    value: { type: Array as PropType<unknown[]>, default: () => [] },
    dataKey: { type: String, default: undefined },
    loading: { type: Boolean, default: false },
    paginator: { type: Boolean, default: false },
    rows: { type: Number, default: 10 },
    scrollHeight: { type: String, default: undefined },
    rowClass: {
      type: Function as PropType<(data: any) => string | Record<string, boolean> | undefined>,
      default: undefined,
    },
    selection: { type: [Array, Object] as PropType<any>, default: null },
    selectionMode: { type: String as PropType<"single" | "multiple" | undefined>, default: undefined },
    metaKeySelection: { type: Boolean, default: false },
  },
  emits: ["rowClick", "update:selection"],
  setup(props, { slots, emit }) {
    const sortField = ref<string | undefined>(undefined);
    const sortOrder = ref<1 | -1 | 0>(0);
    const page = ref(0);

    watch(
      () => props.value,
      () => {
        page.value = 0;
      },
    );

    const columns = computed<ColumnDef[]>(() => {
      const vnodes = (slots.default?.() ?? []).filter((vnode) => vnode.type === TableColumnDef);
      return vnodes.map((vnode) => {
        const p = (vnode.props ?? {}) as Record<string, unknown>;
        const children = (vnode.children ?? {}) as Record<string, unknown>;
        const bodySlot = children.body;
        return {
          field: p.field as string | undefined,
          header: p.header as string | undefined,
          sortable: p.sortable === true || p.sortable === "",
          sortField: (p.sortField as string | undefined) ?? (p.field as string | undefined),
          width: p.width as string | undefined,
          isSelectionMarker: p.selectionMode !== undefined,
          bodySlot: typeof bodySlot === "function" ? (bodySlot as ColumnDef["bodySlot"]) : undefined,
        };
      });
    });

    function cycleSort(col: ColumnDef) {
      if (!col.sortable) return;
      const field = col.sortField;
      if (sortField.value !== field) {
        sortField.value = field;
        sortOrder.value = 1;
      } else if (sortOrder.value === 1) {
        sortOrder.value = -1;
      } else {
        sortField.value = undefined;
        sortOrder.value = 0;
      }
    }

    const sortedRows = computed(() => {
      const rows = [...props.value] as Record<string, unknown>[];
      if (!sortField.value || sortOrder.value === 0) return rows;
      const field = sortField.value;
      const order = sortOrder.value;
      return rows.sort((a, b) => {
        const av = a?.[field];
        const bv = b?.[field];
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        return (av > bv ? 1 : -1) * order;
      });
    });

    const pageSize = computed(() => props.rows || 10);
    const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value)));
    const pagedRows = computed(() => {
      if (!props.paginator) return sortedRows.value;
      const start = page.value * pageSize.value;
      return sortedRows.value.slice(start, start + pageSize.value);
    });

    function keyOf(row: Record<string, unknown>, index: number): PropertyKey {
      const value = props.dataKey ? row[props.dataKey] : index;
      return value as PropertyKey;
    }

    function isSelected(row: Record<string, unknown>) {
      if (!props.selectionMode) return false;
      if (props.selectionMode === "multiple") {
        const arr = (props.selection as Record<string, unknown>[] | null) ?? [];
        return arr.some((item) => (props.dataKey ? item[props.dataKey] === row[props.dataKey] : item === row));
      }
      return props.selection === row;
    }

    function toggleSelection(row: Record<string, unknown>) {
      if (props.selectionMode === "multiple") {
        const arr = [...((props.selection as Record<string, unknown>[] | null) ?? [])];
        const idx = arr.findIndex((item) => (props.dataKey ? item[props.dataKey] === row[props.dataKey] : item === row));
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(row);
        emit("update:selection", arr);
      } else {
        emit("update:selection", props.selection === row ? null : row);
      }
    }

    return () => {
      const cols = columns.value.filter((c) => !c.isSelectionMarker);
      const showSelection = !!props.selectionMode;

      const theadCells = [
        showSelection ? h("th", { class: "base-table__select-col" }) : null,
        ...cols.map((col) =>
          h(
            "th",
            {
              style: col.width ? { width: col.width } : undefined,
              class: { "base-table__th--sortable": col.sortable },
              onClick: () => cycleSort(col),
            },
            [
              col.header,
              col.sortable
                ? h(
                    "span",
                    { class: "base-table__sort-icon" },
                    sortField.value === col.sortField ? (sortOrder.value === 1 ? "▲" : sortOrder.value === -1 ? "▼" : "↕") : "↕",
                  )
                : null,
            ],
          ),
        ),
      ];

      const bodyRows = pagedRows.value.map((row, index) => {
        const record = row as Record<string, unknown>;
        const rc = props.rowClass?.(row);
        return h(
          "tr",
          {
            key: keyOf(record, index),
            class: [rc, { "base-table__row--selected": isSelected(record) }],
            onClick: () => emit("rowClick", { data: row, index }),
          },
          [
            showSelection
              ? h(
                  "td",
                  { class: "base-table__select-col", onClick: (event: Event) => event.stopPropagation() },
                  [
                    h("input", {
                      type: props.selectionMode === "multiple" ? "checkbox" : "radio",
                      checked: isSelected(record),
                      onChange: () => toggleSelection(record),
                    }),
                  ],
                )
              : null,
            ...cols.map((col) =>
              h(
                "td",
                { style: col.width ? { width: col.width } : undefined },
                col.bodySlot ? col.bodySlot({ data: row, index }) : col.field ? String(record?.[col.field] ?? "") : "",
              ),
            ),
          ],
        );
      });

      const tableNode = h("table", { class: "base-table" }, [h("thead", h("tr", theadCells)), h("tbody", bodyRows)]);

      const scrollWrap = h(
        "div",
        {
          class: "base-table__scroll",
          style: props.scrollHeight ? { maxHeight: props.scrollHeight, overflowY: "auto" } : undefined,
        },
        [tableNode],
      );

      return h("div", { class: "base-table-wrapper" }, [
        slots.header ? h("div", { class: "base-table__header" }, slots.header()) : null,
        props.loading
          ? h("div", { class: "base-table__loading" }, slots.loading ? slots.loading() : t("common.state.loading"))
          : pagedRows.value.length === 0
            ? h("div", { class: "base-table__empty" }, slots.empty ? slots.empty() : t("common.empty.noRows"))
            : scrollWrap,
        props.paginator && !props.loading && pagedRows.value.length > 0
          ? h("div", { class: "base-table__paginator" }, [
              h(
                "button",
                { type: "button", disabled: page.value === 0, onClick: () => page.value-- },
                t("common.actions.previous"),
              ),
              h("span", t("common.table.pageOf", { page: page.value + 1, total: pageCount.value })),
              h(
                "button",
                { type: "button", disabled: page.value >= pageCount.value - 1, onClick: () => page.value++ },
                t("common.actions.next"),
              ),
            ])
          : null,
        slots.footer ? h("div", { class: "base-table__footer" }, slots.footer()) : null,
      ]);
    };
  },
});
</script>

<style>
.base-table-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.base-table__scroll {
  width: 100%;
  overflow-x: auto;
}

.base-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.base-table thead th {
  position: sticky;
  top: 0;
  text-align: left;
  padding: var(--space-2) var(--space-4);
  font-weight: var(--weight-semibold);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-normal);
  color: var(--foreground-secondary);
  background: var(--table-header);
  border-bottom: var(--border-width) solid var(--border);
  white-space: nowrap;
}

.base-table__th--sortable {
  cursor: pointer;
  user-select: none;
}

.base-table__sort-icon {
  margin-left: var(--space-1);
  color: var(--foreground-subtle);
  font-size: var(--text-2xs);
}

.base-table tbody td {
  padding: var(--space-2) var(--space-4);
  border-bottom: var(--border-width) solid var(--border-subtle);
  color: var(--foreground);
  vertical-align: middle;
}

.base-table tbody tr {
  transition: background-color var(--transition-fast);
}

/* No zebra striping: with a visible row rule it is redundant and adds noise. */
.base-table tbody tr:hover {
  background: var(--table-row-hover);
}

.base-table__row--selected,
.base-table__row--selected:hover {
  background: var(--selected) !important;
}

.base-table__select-col {
  width: 36px;
  padding: var(--space-2) var(--space-4);
}

.base-table__loading,
.base-table__empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--foreground-secondary);
}

.base-table__paginator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding-top: var(--space-2);
  color: var(--foreground-secondary);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.base-table__paginator button {
  border: var(--border-width) solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  background: var(--surface);
  color: var(--foreground);
  font-size: var(--text-sm);
  transition: background-color var(--transition-fast);
}

.base-table__paginator button:hover:not(:disabled) {
  background: var(--hover);
}

.base-table__paginator button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
