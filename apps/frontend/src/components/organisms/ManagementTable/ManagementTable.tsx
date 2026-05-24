import { type KeyboardEvent, useState } from 'react';
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

export function ManagementTable<TData extends { id: string }>({
  data,
  columns,
  globalFilter,
  onGlobalFilterChange,
  searchLabel,
  schoolFilterOptions = [],
  selectedRowId,
  onRowSelect,
  flushTop,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  searchLabel: string;
  schoolFilterOptions?: string[];
  selectedRowId?: string;
  onRowSelect?: (row: TData) => void;
  flushTop?: boolean;
}) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
  const visibleColumnIds = table.getAllLeafColumns().map((column) => column.id);
  const visibleColumns = table.getVisibleLeafColumns();
  const [zoomedColumnId, setZoomedColumnId] = useState<string | null>(null);
  const zoomWeight = visibleColumns.length > 4 ? 2.4 : 1.8;
  const totalColumnWeight = visibleColumns.reduce(
    (total, column) => total + (column.id === zoomedColumnId ? zoomWeight : 1),
    0
  );
  const schoolColumn = visibleColumnIds.includes('school') ? table.getColumn('school') : undefined;
  const selectedSchools = (schoolColumn?.getFilterValue() as string[] | undefined) ?? [];
  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: TData) => {
    if (!onRowSelect || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onRowSelect(row);
  };
  const isCropped = (element: HTMLElement) => {
    if (element.scrollWidth > element.clientWidth + 1) return true;

    return Array.from(element.querySelectorAll<HTMLElement>('*')).some(
      (child) => child.scrollWidth > child.clientWidth + 1
    );
  };
  const handleColumnZoom = (columnId: string, element: HTMLElement) => {
    setZoomedColumnId(isCropped(element) ? columnId : null);
  };
  const clearColumnZoom = (columnId: string) => {
    setZoomedColumnId((current) => (current === columnId ? null : current));
  };
  const getColumnWidth = (columnId: string) => {
    const weight = columnId === zoomedColumnId ? zoomWeight : 1;
    return `${(weight / totalColumnWeight) * 100}%`;
  };

  return (
    <div
      className={cn(
        'overflow-visible rounded-xl border border-gaming-border bg-gaming-card shadow-lg',
        flushTop && 'rounded-tl-none'
      )}
    >
      <div className="flex flex-col gap-2 border-b border-gaming-border bg-gaming-card p-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={globalFilter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          aria-label={searchLabel}
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
      <div className="overflow-hidden">
        <table className="table w-full table-fixed">
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                style={{
                  width: getColumnWidth(column.id),
                }}
              />
            ))}
          </colgroup>
          <thead className="bg-gaming-base/60 text-text-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="overflow-hidden whitespace-nowrap font-display text-xs uppercase tracking-wider transition-[width] duration-200"
                    style={{ width: getColumnWidth(header.column.id) }}
                    onPointerEnter={(event) =>
                      handleColumnZoom(header.column.id, event.currentTarget)
                    }
                    onPointerLeave={() => clearColumnZoom(header.column.id)}
                    onFocus={(event) => handleColumnZoom(header.column.id, event.currentTarget)}
                    onBlur={() => clearColumnZoom(header.column.id)}
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
                onKeyDown={(event) => handleRowKeyDown(event, row.original)}
                tabIndex={onRowSelect ? 0 : undefined}
                className={cn(
                  'border-gaming-border hover:bg-gaming-base/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gaming-border/60',
                  onRowSelect && 'cursor-pointer focus-visible:bg-gaming-base/40',
                  selectedRowId === row.original.id &&
                    'bg-gaming-base/60 outline outline-1 outline-solarized-blue/50'
                )}
                aria-selected={selectedRowId === row.original.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="overflow-hidden whitespace-nowrap text-text-secondary transition-[width] duration-200"
                    style={{ width: getColumnWidth(cell.column.id) }}
                    onPointerEnter={(event) =>
                      handleColumnZoom(cell.column.id, event.currentTarget)
                    }
                    onPointerLeave={() => clearColumnZoom(cell.column.id)}
                    onFocus={(event) => handleColumnZoom(cell.column.id, event.currentTarget)}
                    onBlur={() => clearColumnZoom(cell.column.id)}
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
