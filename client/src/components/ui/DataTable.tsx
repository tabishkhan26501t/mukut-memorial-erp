import { ChevronLeft, ChevronRight, Search, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import { TableSkeleton } from './LoadingSkeleton';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pagination?: { page: number; pages: number; total: number; limit: number };
  onPageChange?: (page: number) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export default function DataTable<T extends { id: number }>({
  columns, data, loading, searchable, searchValue, onSearchChange,
  pagination, onPageChange, onEdit, onDelete,
}: DataTableProps<T>) {
  return (
    <div className="card overflow-hidden">
      {searchable && (
        <div className="px-5 py-3.5 border-b border-surface-100 dark:border-surface-800">
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              placeholder="Search records..."
              aria-label="Search records"
              value={searchValue || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={8} cols={columns.length + (onEdit || onDelete ? 1 : 0)} /></div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <SlidersHorizontal size={22} className="text-surface-400" />
            </div>
            <p className="text-sm font-medium text-surface-900 dark:text-white">No data found</p>
            <p className="text-xs text-surface-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800">
                {columns.map((col) => (
                  <th key={col.key} className="table-header">{col.header}</th>
                ))}
                {(onEdit || onDelete) && <th className="table-header text-right w-24">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {data.map((item) => (
                <tr
                  key={item.id}
                  className="group hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="table-cell">
                      {col.render ? col.render(item) : (item as any)[col.key]?.toString() || <span className="text-surface-500">&mdash;</span>}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                            title="Edit"
                            aria-label={`Edit record ${item.id}`}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-2 rounded-lg text-surface-500 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Delete"
                            aria-label={`Delete record ${item.id}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
          <p className="text-xs text-surface-500">
            Page <strong className="text-surface-700 dark:text-surface-300">{pagination.page}</strong> of {pagination.pages} &middot; {pagination.total} total records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(pagination.pages, 5) }).map((_, i) => {
              const start = Math.max(1, Math.min(pagination.page - 2, pagination.pages - 4));
              const pageNum = start + i;
              if (pageNum > pagination.pages || pageNum < 1) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                    pageNum === pagination.page
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:text-surface-400'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}