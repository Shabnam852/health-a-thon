import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment, useMemo, useState } from "react";
import Button from "./Button.jsx";
import EmptyState from "./EmptyState.jsx";
import { Input } from "./Field.jsx";
import FilterSelect from "./FilterSelect.jsx";
import Icon from "./Icon.jsx";

// A select filter matches the whole value; a column holding a list (a mother and baby) matches any item.
const equalsOrIncludes = (row, columnId, value) => {
  const cell = row.getValue(columnId);
  return Array.isArray(cell) ? cell.includes(value) : cell === value;
};

const SORT_ICONS = { asc: "arrow_upward", desc: "arrow_downward" };

/**
 * The one table. Columns are TanStack column defs, plus:
 *   meta.filter: true    adds a dropdown of the column's values to the toolbar
 *   meta.filterLabel     the dropdown's name, if not the header
 *   meta.label           a value's display text in that dropdown: (value) => string
 *   meta.className       classes for the column's cells (e.g. "text-right", "w-0")
 *   meta.hidden: true    searchable but never shown
 *   meta.srOnly: true    the header is read out but not drawn (an actions column)
 *   meta.sticky: true    pinned to the right edge, so buttons stay in reach while the table scrolls
 * Search runs over every column with an accessor. renderDetail(row) makes rows expandable,
 * and getRowClassName(row) styles a row (e.g. dimming rows that don't fit a filter).
 * renderBelow(rows) draws more content from the rows the filters and search leave, so a second
 * view of the same rows (a grid, a map) always agrees with the table.
 * Keep column defs outside components: flexRender mounts each cell function as a component,
 * so a def rebuilt on every render remounts its cells. Cells reach page handlers and live
 * values through `context`, read as table.options.meta.
 * Under sm the table scrolls sideways inside its card, never the page.
 */
const DataTable = ({
  label,
  data,
  columns,
  searchPlaceholder = "Search",
  search = true,
  emptyText = "Nothing to show.",
  noMatchText = "Nothing matches.",
  initialSorting = [],
  pageSize = 25,
  renderDetail,
  getRowId = (row) => row.id,
  toolbar,
  context,
  getRowClassName,
  renderBelow,
}) => {
  const [sorting, setSorting] = useState(initialSorting);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Every toolbar dropdown matches by value, so pages do not have to name a filterFn.
  const tableColumns = useMemo(
    () => columns.map((c) => (c.meta?.filter && !c.filterFn ? { ...c, filterFn: "equalsOrIncludes" } : c)),
    [columns],
  );

  // oxlint-disable-next-line react/incompatible-library -- no React Compiler in this app; TanStack's functions are read fresh each render.
  const table = useReactTable({
    data,
    columns: tableColumns,
    meta: context,
    state: { sorting, globalFilter, columnFilters, expanded },
    // Pages build `data` fresh each render, so TanStack's auto-reset would send the table back to
    // page 1 whenever anything on the page re-rendered. Reset only when the user changes the view.
    onSortingChange: (u) => {
      setSorting(u);
      table.resetPageIndex();
    },
    onGlobalFilterChange: (u) => {
      setGlobalFilter(u);
      table.resetPageIndex();
    },
    onColumnFiltersChange: (u) => {
      setColumnFilters(u);
      table.resetPageIndex();
    },
    onExpandedChange: setExpanded,
    getRowId,
    getRowCanExpand: () => Boolean(renderDetail),
    filterFns: { equalsOrIncludes },
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
      // A column def may carry only an accessorKey, whose id TanStack derives from it.
      columnVisibility: Object.fromEntries(
        columns.filter((c) => c.meta?.hidden).map((c) => [c.id ?? c.accessorKey, false]),
      ),
    },
    autoResetPageIndex: false,
    // Rows are keyed by id, so an open row stays open across new data.
    autoResetExpanded: false,
  });

  const filterColumns = table.getAllLeafColumns().filter((c) => c.columnDef.meta?.filter);
  const isFiltered = Boolean(globalFilter) || columnFilters.length > 0;
  const rows = table.getRowModel().rows;
  // The row's place in the list as sorted and filtered now, counted once rather than per cell.
  const { pageIndex, pageSize: size } = table.getState().pagination;
  const rowNumbers = new Map(rows.map((r, i) => [r.id, pageIndex * size + i + 1]));
  const total = table.getFilteredRowModel().rows.length;
  const colCount = table.getVisibleLeafColumns().length + (renderDetail ? 1 : 0);

  const clearFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
  };

  const filterOptions = (column) => {
    const values = new Set();
    for (const v of column.getFacetedUniqueValues().keys()) {
      for (const item of Array.isArray(v) ? v : [v]) if (item != null && item !== "") values.add(item);
    }
    const toText = column.columnDef.meta?.label || String;
    return [...values].map((v) => [v, toText(v)]).sort((a, b) => a[1].localeCompare(b[1]));
  };

  // With nothing to show, keep only the page's own toolbar: its filters may be what emptied the table.
  if (data.length === 0) {
    return (
      <div className="space-y-3">
        {toolbar && <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">{toolbar}</div>}
        <EmptyState>{emptyText}</EmptyState>
      </div>
    );
  }

  const showToolbar = search || filterColumns.length > 0 || toolbar;

  return (
    <div className="space-y-3">
      {showToolbar && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          {search && (
            <Input
              aria-label={`Search ${label}`}
              type="search"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="sm:flex-1 sm:min-w-56"
            />
          )}
          {filterColumns.map((column) => {
            const name = column.columnDef.meta.filterLabel || column.columnDef.header;
            return (
              <FilterSelect
                key={column.id}
                label={name}
                value={column.getFilterValue() ?? ""}
                options={filterOptions(column)}
                onChange={(v) => column.setFilterValue(v === "" ? undefined : v)}
                className="sm:w-44"
              />
            );
          })}
          {toolbar}
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="bg-surface border border-line rounded-card shadow-card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <caption className="sr-only">{label}</caption>
          <thead className="bg-muted text-ink-muted">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-line">
                {renderDetail && (
                  <th scope="col" className="w-0 px-2">
                    <span className="sr-only">Details</span>
                  </th>
                )}
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const rendered = flexRender(header.column.columnDef.header, header.getContext());
                  const content = header.column.columnDef.meta?.srOnly ? (
                    <span className="sr-only">{rendered}</span>
                  ) : (
                    rendered
                  );
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                      className={`px-3 py-2 font-semibold whitespace-nowrap ${header.column.columnDef.meta?.sticky ? "sticky right-0 bg-muted" : ""} ${header.column.columnDef.meta?.className || ""}`}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 rounded-control hover:text-ink"
                        >
                          {content}
                          <Icon
                            name={SORT_ICONS[sorted] || "unfold_more"}
                            size="sm"
                            className={sorted ? "text-ink" : "opacity-40"}
                          />
                        </button>
                      ) : (
                        content
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-6 text-center text-ink-muted">
                  {noMatchText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className={`align-top hover:bg-muted/60 ${getRowClassName?.(row.original) || ""}`}>
                    {renderDetail && (
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="!min-h-control-sm !min-w-0 px-1"
                          aria-expanded={row.getIsExpanded()}
                          aria-label={`${row.getIsExpanded() ? "Hide" : "Show"} details`}
                          onClick={row.getToggleExpandedHandler()}
                        >
                          <Icon name="chevron_right" size="sm" className={row.getIsExpanded() ? "rotate-90" : ""} />
                        </Button>
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-3 py-2.5 ${cell.column.columnDef.meta?.sticky ? "sticky right-0 bg-surface shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.15)]" : ""} ${cell.column.columnDef.meta?.className || ""}`}
                      >
                        {flexRender(cell.column.columnDef.cell, {
                          ...cell.getContext(),
                          rowNumber: rowNumbers.get(row.id),
                        })}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr className="bg-muted/40">
                      <td colSpan={colCount} className="px-3 py-3 text-ink-muted">
                        <div className="space-y-1 break-words max-w-prose">{renderDetail(row.original)}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
        <span className="tabular-nums">
          {isFiltered ? `${total} of ${data.length}` : `${data.length}`} {data.length === 1 ? "row" : "rows"}
        </span>
        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <span className="tabular-nums">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        )}
      </div>

      {renderBelow?.(table.getFilteredRowModel().rows.map((r) => r.original))}
    </div>
  );
};

export default DataTable;
