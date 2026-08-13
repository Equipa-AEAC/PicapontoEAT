<script lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType, type VNode } from "vue";
import TableColumnDef from "./TableColumn.vue";

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
          ? h("div", { class: "base-table__loading" }, slots.loading ? slots.loading() : "Loading records...")
          : pagedRows.value.length === 0
            ? h("div", { class: "base-table__empty" }, slots.empty ? slots.empty() : "No records found.")
            : scrollWrap,
        props.paginator && !props.loading && pagedRows.value.length > 0
          ? h("div", { class: "base-table__paginator" }, [
              h("button", { type: "button", disabled: page.value === 0, onClick: () => page.value-- }, "Prev"),
              h("span", `Page ${page.value + 1} of ${pageCount.value}`),
              h("button", { type: "button", disabled: page.value >= pageCount.value - 1, onClick: () => page.value++ }, "Next"),
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
  font-size: 0.9rem;
}

.base-table thead th {
  position: sticky;
  top: 0;
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid var(--surface-border);
  white-space: nowrap;
}

.base-table__th--sortable {
  cursor: pointer;
  user-select: none;
}

.base-table__sort-icon {
  margin-left: 6px;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.base-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  color: var(--text-primary);
  vertical-align: middle;
}

.base-table tbody tr:hover {
  background: rgba(122, 167, 255, 0.06);
}

.base-table tbody tr:nth-child(even) {
  background: rgba(15, 23, 42, 0.32);
}

.base-table tbody tr:nth-child(even):hover {
  background: rgba(122, 167, 255, 0.08);
}

.base-table__row--selected {
  background: rgba(122, 167, 255, 0.14) !important;
}

.base-table__select-col {
  width: 40px;
  padding: 12px 16px;
}

.base-table__loading,
.base-table__empty {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-secondary);
}

.base-table__paginator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-top: 4px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.base-table__paginator button {
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  background: rgba(17, 26, 42, 0.78);
  color: var(--text-primary);
}

.base-table__paginator button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
