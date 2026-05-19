"use client";

import type { MetaAdAccount } from "@/lib/meta/types";

const ACCOUNT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  1:   { label: "Active",              color: "text-green-600" },
  2:   { label: "Disabled",            color: "text-red-500" },
  3:   { label: "Unsettled",           color: "text-amber-600" },
  7:   { label: "Pending Risk Review", color: "text-amber-600" },
  8:   { label: "Pending Settlement",  color: "text-amber-600" },
  9:   { label: "In Grace Period",     color: "text-amber-600" },
  100: { label: "Pending Closure",     color: "text-red-500" },
  101: { label: "Closed",              color: "text-foreground-muted" },
  201: { label: "Any Active",          color: "text-green-600" },
  202: { label: "Any Closed",          color: "text-foreground-muted" },
};

interface AccountsListProps {
  accounts: MetaAdAccount[];
  onSelect: (account: MetaAdAccount) => void;
}

export function AccountsList({ accounts, onSelect }: AccountsListProps) {
  if (!accounts.length) {
    return (
      <div className="flex flex-col items-center justify-center h-60 gap-2">
        <p className="text-foreground-secondary text-sm">No ad accounts found</p>
        <p className="text-foreground-muted text-xs">Make sure your Meta account has access to at least one ad account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Ad Accounts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((account) => {
          const status = ACCOUNT_STATUS_MAP[account.account_status] ?? {
            label: `Status ${account.account_status}`,
            color: "text-foreground-muted",
          };
          return (
            <button
              key={account.id}
              onClick={() => onSelect(account)}
              className="card card-hover rounded-xl p-4 text-left group transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground truncate group-hover:text-foreground transition-colors">
                    {account.name || `Account ${account.account_id}`}
                  </h3>
                  <p className="text-xs text-foreground-muted mt-0.5 font-mono">
                    {account.account_id}
                  </p>
                </div>
                <svg className="h-4 w-4 text-foreground-muted shrink-0 mt-0.5 group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className={status.color}>{status.label}</span>
                <span className="text-foreground-muted">{account.currency}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
