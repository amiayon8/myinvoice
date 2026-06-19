import React from 'react';

export function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="gap-8 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 p-6 border border-slate-100 dark:border-slate-800/60 rounded-xl space-y-4 shadow-sm"
        >
          <Shimmer className="h-3 w-1/2" />
          <Shimmer className="h-8 w-3/4" />
          <div className="flex gap-2">
            <Shimmer className="h-3.5 w-1/4" />
            <Shimmer className="h-3.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-lg overflow-hidden shadow-xl">
      <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center">
        <Shimmer className="h-5 w-1/4" />
        <Shimmer className="h-9 w-20" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {[...Array(cols)].map((_, i) => (
                <th key={i} className="px-6 py-4">
                  <Shimmer className="h-3.5 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {[...Array(rows)].map((_, r) => (
              <tr key={r}>
                {[...Array(cols)].map((_, c) => (
                  <td key={c} className="px-6 py-5">
                    {c === 1 ? (
                      <div className="space-y-2">
                        <Shimmer className="h-4 w-28" />
                        <Shimmer className="h-3 w-20" />
                      </div>
                    ) : (
                      <Shimmer className={`h-4 ${c === cols - 1 ? 'w-10 ml-auto' : 'w-20'}`} />
                    )}
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

export function ClientGridSkeleton() {
  return (
    <div className="gap-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div className="border-2 border-slate-200 dark:border-white/10 border-dashed rounded-lg min-h-[250px] flex items-center justify-center">
        <Shimmer className="h-16 w-16 rounded-lg" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 p-8 rounded-lg space-y-4 shadow-sm"
        >
          <Shimmer className="h-14 w-14 rounded-lg" />
          <Shimmer className="h-6 w-3/4" />
          <Shimmer className="h-4 w-1/2" />
          <hr className="border-slate-100 dark:border-slate-800" />
          <div className="grid grid-cols-3 gap-2 py-2">
            <div className="text-center space-y-1">
              <Shimmer className="h-2 w-8 mx-auto" />
              <Shimmer className="h-3 w-12 mx-auto" />
            </div>
            <div className="text-center space-y-1">
              <Shimmer className="h-2 w-8 mx-auto" />
              <Shimmer className="h-3 w-12 mx-auto" />
            </div>
            <div className="text-center space-y-1">
              <Shimmer className="h-2 w-8 mx-auto" />
              <Shimmer className="h-3 w-12 mx-auto" />
            </div>
          </div>
          <Shimmer className="h-4 w-full" />
          <Shimmer className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Shimmer className="h-3 w-1/3" />
              <Shimmer className="h-8 w-1/2" />
              <Shimmer className="h-3.5 w-2/3" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <Shimmer className="h-4 w-1/4 border-b pb-2" />
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Shimmer className="h-3 w-1/3" />
                <Shimmer className="h-5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <Shimmer className="h-5 w-1/3" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-4">
            <Shimmer className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Shimmer className="h-4 w-1/3" />
                <Shimmer className="h-3 w-12" />
              </div>
              <Shimmer className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
