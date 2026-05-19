"use client";

import type { MetaInsightsFull } from "@/lib/meta/types";
import { StatusBadge } from "./status-badge";
import { formatCurrency, formatCompact, formatPercent } from "@/lib/format";

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T, insights: MetaInsightsFull | null) => React.ReactNode;
  align?: "left" | "right";
  width?: string;
}

interface EntityTableProps<T> {
  items: T[];
  columns: Column<T>[];
  insights: Record<string, MetaInsightsFull | null>;
  getId: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function EntityTable<T>({
  items,
  columns,
  insights,
  getId,
  onRowClick,
  emptyMessage = "No data",
}: EntityTableProps<T>) {
  if (!items.length) {
    return (
      <div className="card rounded-xl p-10 flex items-center justify-center">
        <p className="text-foreground-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-hover">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11px] font-medium text-foreground-muted uppercase tracking-wider ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const id = getId(item);
              const ins = insights[id] ?? null;
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(item)}
                  className={`border-b border-border last:border-0 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-hover" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {col.render(item, ins)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function statusColumn<T extends { status: string }>(): Column<T> {
  return {
    key: "status",
    label: "Status",
    width: "100px",
    render: (item) => <StatusBadge status={item.status} />,
  };
}

export function nameColumn<T extends { name: string }>(label = "Name"): Column<T> {
  return {
    key: "name",
    label,
    render: (item) => <span className="font-medium text-foreground">{item.name}</span>,
  };
}

export function spendColumn<T>(): Column<T> {
  return {
    key: "spend",
    label: "Spend",
    align: "right",
    render: (_, ins) => (
      <span className="font-mono text-foreground tabular-nums">{ins ? formatCurrency(ins.spend) : "—"}</span>
    ),
  };
}

export function impressionsColumn<T>(): Column<T> {
  return {
    key: "impressions",
    label: "Impr.",
    align: "right",
    render: (_, ins) => (
      <span className="font-mono text-foreground-secondary tabular-nums">{ins ? formatCompact(ins.impressions) : "—"}</span>
    ),
  };
}

export function clicksColumn<T>(): Column<T> {
  return {
    key: "clicks",
    label: "Clicks",
    align: "right",
    render: (_, ins) => (
      <span className="font-mono text-foreground-secondary tabular-nums">{ins ? formatCompact(ins.clicks) : "—"}</span>
    ),
  };
}

export function ctrColumn<T>(): Column<T> {
  return {
    key: "ctr",
    label: "CTR",
    align: "right",
    render: (_, ins) => (
      <span className="font-mono text-foreground-secondary tabular-nums">{ins ? formatPercent(ins.ctr) : "—"}</span>
    ),
  };
}

export function cpcColumn<T>(): Column<T> {
  return {
    key: "cpc",
    label: "CPC",
    align: "right",
    render: (_, ins) => (
      <span className="font-mono text-foreground-secondary tabular-nums">{ins ? formatCurrency(ins.cpc) : "—"}</span>
    ),
  };
}
