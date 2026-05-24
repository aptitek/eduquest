import { useState } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { BadgeDropdown } from '../../molecules/BadgeDropdown';
import { SchoolLogoBadge } from '../../molecules/SchoolLogoBadge';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

const DEFAULT_COLUMN_BOUNDS = {
  min: 5,
  max: 18,
  expandedMax: 24,
};

const COLUMN_BOUNDS: Record<string, { min: number; max: number; expandedMax?: number }> = {
  avatar: { min: 5, max: 5, expandedMax: 5 },
  logo: { min: 8, max: 8, expandedMax: 8 },
  displayName: { min: 8, max: 16, expandedMax: 22 },
  pronouns: { min: 5, max: 10, expandedMax: 13 },
  email: { min: 10, max: 18, expandedMax: 26 },
  school: { min: 5, max: 9, expandedMax: 12 },
  age: { min: 4, max: 4, expandedMax: 4 },
  website: { min: 8, max: 16, expandedMax: 24 },
  address: { min: 10, max: 20, expandedMax: 30 },
  cohortCount: { min: 5, max: 6, expandedMax: 6 },
  studentCount: { min: 5, max: 6, expandedMax: 6 },
  schoolName: { min: 5, max: 9, expandedMax: 12 },
  campusName: { min: 6, max: 12, expandedMax: 16 },
  schoolYear: { min: 5, max: 6, expandedMax: 6 },
  grade: { min: 5, max: 7, expandedMax: 7 },
  level: { min: 4, max: 4, expandedMax: 4 },
  name: { min: 8, max: 17, expandedMax: 24 },
  speciality: { min: 7, max: 15, expandedMax: 20 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDisplayLength(value: unknown) {
  if (value === undefined || value === null || value === '') return 1;
  if (typeof value === 'number') return String(value).length;
  if (typeof value === 'string') return value.replace(/^https?:\/\//, '').length;
  return 1;
}

function getHeaderLength(header: unknown, columnId: string) {
  return typeof header === 'string' ? header.length : columnId.length;
}

function getColumnWeight({
  columnId,
  header,
  values,
  isExpanded,
}: {
  columnId: string;
  header: unknown;
  values: unknown[];
  isExpanded: boolean;
}) {
  const bounds = COLUMN_BOUNDS[columnId] || DEFAULT_COLUMN_BOUNDS;
  const longestValue = values.reduce<number>(
    (longest, value) => Math.max(longest, getDisplayLength(value)),
    getHeaderLength(header, columnId)
  );
  const contentWeight = Math.ceil(longestValue * 0.62) + 2;
  const baseWeight = clamp(contentWeight, bounds.min, bounds.max);
  const expandedMax = bounds.expandedMax ?? bounds.max;

  return isExpanded ? clamp(Math.ceil(baseWeight * 1.45), baseWeight, expandedMax) : baseWeight;
}

function getColumnWidthPercentages(
  columns: { id: string; header: unknown; values: unknown[] }[],
  expandedColumnId: string | null
) {
  const weights = columns.map((column) =>
    getColumnWeight({
      columnId: column.id,
      header: column.header,
      values: column.values,
      isExpanded: expandedColumnId === column.id,
    })
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return Object.fromEntries(
    columns.map((column, index) => [column.id, `${(weights[index] / total) * 100}%`])
  );
}

export function ManagementTable<TData extends { id: string }>({
  data,
  columns,
  globalFilter,
  onGlobalFilterChange,
  schoolFilterOptions = [],
  selectedRowId,
  onRowSelect,
  flushTop,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  schoolFilterOptions?: string[];
  selectedRowId?: string;
  onRowSelect?: (row: TData) => void;
  flushTop?: boolean;
}) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expandedColumnId, setExpandedColumnId] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      globalFilter,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });
  const schoolColumn = table.getColumn('school');
  const selectedSchools = (schoolColumn?.getFilterValue() as string[] | undefined) ?? [];
  const visibleColumns = table.getVisibleLeafColumns();
  const displayedRows = table.getRowModel().rows;
  const columnWidths = getColumnWidthPercentages(
    visibleColumns.map((column) => ({
      id: column.id,
      header: column.columnDef.header,
      values: displayedRows.map((row) => row.getValue(column.id)),
    })),
    expandedColumnId
  );

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gaming-border bg-gaming-card shadow-lg',
        flushTop && 'rounded-tl-none'
      )}
    >
      <div className="flex flex-col gap-2 border-b border-gaming-border bg-gaming-card p-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={globalFilter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={t('management.filters.searchPlaceholder')}
          className="input input-bordered input-sm min-w-0 flex-1 bg-gaming-base border-gaming-border text-text-primary"
        />
        {schoolColumn && schoolFilterOptions.length > 0 && (
          <BadgeDropdown
            options={schoolFilterOptions}
            value={selectedSchools}
            onChange={(next) => schoolColumn.setFilterValue(next.length > 0 ? next : undefined)}
            multiple
            placeholder={t('management.filters.allSchools')}
            searchPlaceholder={t('management.filters.school')}
            emptyFilterHint={t('management.filters.noSchools')}
            badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
            selectedMaxWidth="max-w-[16rem]"
            showArrow
            renderBadge={(school) => <SchoolLogoBadge name={school} />}
          />
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="table table-fixed w-full">
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                style={{ width: columnWidths[column.id] }}
                className="transition-[width] duration-300 ease-out"
              />
            ))}
          </colgroup>
          <thead className="bg-gaming-base/60 text-text-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onMouseEnter={() => setExpandedColumnId(header.column.id)}
                    onMouseLeave={() => setExpandedColumnId(null)}
                    className="overflow-hidden whitespace-nowrap font-display text-xs uppercase tracking-wider transition-[width] duration-300 ease-out"
                    style={{ width: columnWidths[header.column.id] }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 overflow-hidden whitespace-nowrap uppercase tracking-wider',
                          header.column.getCanSort() && 'cursor-pointer hover:text-text-primary',
                          !header.column.getCanSort() && 'cursor-default'
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: '↑',
                          desc: '↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowSelect?.(row.original)}
                className={cn(
                  'border-gaming-border hover:bg-gaming-base/40',
                  onRowSelect && 'cursor-pointer',
                  selectedRowId === row.original.id &&
                    'bg-gaming-base/60 outline outline-1 outline-solarized-blue/50'
                )}
                aria-selected={selectedRowId === row.original.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    onMouseEnter={() => setExpandedColumnId(cell.column.id)}
                    onMouseLeave={() => setExpandedColumnId(null)}
                    className="overflow-hidden whitespace-nowrap text-text-secondary transition-[width] duration-300 ease-out"
                    style={{ width: columnWidths[cell.column.id] }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
