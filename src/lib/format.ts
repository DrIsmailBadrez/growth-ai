export function formatCurrency(value: string | number, currency = "USD"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(num));
}

export function formatPercent(value: string | number, decimals = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0%";
  return `${num.toFixed(decimals)}%`;
}

export function formatCompact(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(num % 1 === 0 ? 0 : 1);
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRanking(ranking?: string): { label: string; color: string } {
  if (!ranking || ranking === "" || ranking === "UNKNOWN") {
    return { label: "N/A", color: "text-foreground-muted" };
  }
  const map: Record<string, { label: string; color: string }> = {
    ABOVE_AVERAGE: { label: "Above Average", color: "text-green-600" },
    AVERAGE: { label: "Average", color: "text-amber-600" },
    BELOW_AVERAGE_10: { label: "Below Average (Bottom 10%)", color: "text-orange-600" },
    BELOW_AVERAGE_20: { label: "Below Average (Bottom 20%)", color: "text-orange-600" },
    BELOW_AVERAGE_35: { label: "Below Average (Bottom 35%)", color: "text-red-600" },
  };
  return map[ranking] ?? { label: ranking.replace(/_/g, " ").toLowerCase(), color: "text-foreground-muted" };
}
