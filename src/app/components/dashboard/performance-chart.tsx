"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MetaInsightsTimeSeries } from "@/lib/meta/types";
import { formatDateShort, formatCurrency, formatCompact, formatPercent } from "@/lib/format";

interface PerformanceChartProps {
  timeSeries: MetaInsightsTimeSeries[];
}

type MetricKey = "spend" | "impressions" | "clicks" | "ctr" | "cpc" | "reach";

const METRICS: { key: MetricKey; label: string; format: (v: number) => string; color: string }[] = [
  { key: "spend",       label: "Spend",       format: formatCurrency,  color: "#18181b" },
  { key: "impressions", label: "Impressions",  format: formatCompact,   color: "#2563eb" },
  { key: "clicks",      label: "Clicks",       format: formatCompact,   color: "#0891b2" },
  { key: "ctr",         label: "CTR",          format: formatPercent,   color: "#16a34a" },
  { key: "cpc",         label: "CPC",          format: formatCurrency,  color: "#d97706" },
  { key: "reach",       label: "Reach",        format: formatCompact,   color: "#9333ea" },
];

export function PerformanceChart({ timeSeries }: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("spend");

  if (!timeSeries.length) {
    return (
      <div className="card rounded-xl p-6 flex items-center justify-center h-[280px]">
        <p className="text-foreground-muted text-sm">No time series data available</p>
      </div>
    );
  }

  const metric = METRICS.find((m) => m.key === activeMetric)!;

  const chartData = timeSeries.map((row) => ({
    date: formatDateShort(row.date_start),
    value: parseFloat(row[activeMetric] || "0"),
  }));

  return (
    <div className="card rounded-xl p-5 space-y-4">
      {/* Metric tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMetric(m.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeMetric === m.key
                ? "bg-foreground text-background"
                : "text-foreground-secondary hover:bg-hover hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={metric.color} stopOpacity={0.12} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e4e4e7" }}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => metric.format(v)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: "8px",
                color: "#09090b",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [metric.format(Number(value ?? 0)), metric.label]}
              labelStyle={{ color: "#52525b" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2}
              fill="url(#chartGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
