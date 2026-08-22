export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex gap-6 mb-4 pb-3 border-b border-surface-100 dark:border-surface-800">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3.5 bg-surface-200 dark:bg-surface-700 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-6 py-3 border-b border-surface-100/50 dark:border-surface-800/50 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-5 bg-surface-100 dark:bg-surface-800 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse card p-5">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-surface-200 dark:bg-surface-700 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-1/3" />
          <div className="h-7 bg-surface-200 dark:bg-surface-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-surface-200 dark:bg-surface-700 rounded w-48" />
      <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-72" />
      <div className="h-12 bg-surface-200 dark:bg-surface-700 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-24 bg-surface-100 dark:bg-surface-800 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}