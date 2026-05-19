"use client";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-hover animate-pulse ${className}`} />
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px]" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="h-[280px]" />;
}

export function TableSkeleton() {
  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="h-10 border-b border-border bg-hover" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`h-14 border-b border-border last:border-0 animate-pulse ${i % 2 === 0 ? "bg-background-secondary" : "bg-background"}`} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <MetricsGridSkeleton />
      <ChartSkeleton />
      <TableSkeleton />
    </div>
  );
}
