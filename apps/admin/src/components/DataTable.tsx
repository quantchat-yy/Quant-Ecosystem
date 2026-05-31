'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, Button } from '@quant/shared-ui';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  renderRow?: (row: T, columns: Column<T>[]) => React.ReactNode;
}

function SortIndicator({ direction }: { direction: SortDirection }) {
  if (!direction) {
    return <span className="ml-1 text-[var(--quant-muted-foreground)] opacity-40">&#8597;</span>;
  }
  return (
    <span className="ml-1 text-[var(--quant-foreground)]">
      {direction === 'asc' ? '\u2191' : '\u2193'}
    </span>
  );
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  selectable = false,
  onSelectionChange,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
  totalItems,
  currentPage = 1,
  onPageChange,
  renderRow,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const total = totalItems ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleSelect = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange?.(Array.from(next));
        return next;
      });
    },
    [onSelectionChange],
  );

  const toggleAll = useCallback(() => {
    if (selected.size === data.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const all = new Set(data.map((r) => r.id));
      setSelected(all);
      onSelectionChange?.(Array.from(all));
    }
  }, [data, selected.size, onSelectionChange]);

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--quant-border)]">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-[var(--quant-border)]"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)] ${
                    col.sortable
                      ? 'cursor-pointer select-none hover:text-[var(--quant-foreground)]'
                      : ''
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    {col.sortable && (
                      <SortIndicator direction={sortKey === col.key ? sortDir : null} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) =>
              renderRow ? (
                renderRow(row, columns)
              ) : (
                <tr
                  key={row.id}
                  className="border-b border-[var(--quant-border)] last:border-0 hover:bg-[var(--quant-muted)]/30"
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-[var(--quant-border)]"
                        aria-label={`Select row ${row.id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[var(--quant-foreground)]">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ),
            )}
            {sortedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-[var(--quant-muted-foreground)]"
                >
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-[var(--quant-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--quant-muted-foreground)]">
            Page {currentPage} of {totalPages}
          </span>
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-[var(--quant-border)] bg-[var(--quant-background)] px-2 py-1 text-xs text-[var(--quant-foreground)]"
              aria-label="Page size"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onPageChange?.(currentPage - 1)} disabled={currentPage <= 1}>
            Previous
          </Button>
          <Button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
