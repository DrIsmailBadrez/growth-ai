"use client";

import type { DatePreset } from "@/lib/meta/types";

interface DateRangePickerProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today",      label: "Today" },
  { value: "yesterday",  label: "Yesterday" },
  { value: "last_7d",    label: "7 days" },
  { value: "last_14d",   label: "14 days" },
  { value: "last_30d",   label: "30 days" },
  { value: "last_90d",   label: "90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-background-secondary p-0.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange(preset.value)}
          className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            value === preset.value
              ? "bg-foreground text-background"
              : "text-foreground-secondary hover:bg-hover hover:text-foreground"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
