"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatContext } from "./chat-provider";

const links = [
  { href: "/", label: "Chat", icon: ChatIcon, hint: "Create campaigns" },
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, hint: "View analytics" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setMessages } = useChatContext();
  const [connected, setConnected] = useState<boolean | null>(null);

  const handleLogoClick = () => {
    setMessages([]);
    router.push("/");
  };

  useEffect(() => {
    fetch("/api/meta/status")
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  return (
    <nav className="flex w-14 flex-col border-r border-border bg-background-secondary py-4 lg:w-56 lg:px-3">
      {/* Logo */}
      <button
        type="button"
        onClick={handleLogoClick}
        className="mb-6 px-2 lg:px-1 text-left w-full"
      >
        <h1 className="hidden text-sm font-semibold text-foreground tracking-tight lg:block hover:text-foreground-secondary transition-colors">
          Growth AI
        </h1>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground lg:hidden mx-auto hover:opacity-80 transition-opacity">
          <span className="text-xs font-bold text-background">G</span>
        </div>
      </button>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors lg:px-3 ${
                active
                  ? "nav-active font-medium"
                  : "text-foreground-secondary hover:bg-hover hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Connection status */}
      <div className="border-t border-border pt-3 mt-3">
        {connected === null ? null : connected ? (
          <div className="flex items-center gap-2 px-2 py-1.5 lg:px-3">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-green-500 animate-[pulse-dot_2s_ease-in-out_infinite]" />
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="hidden text-xs text-foreground-muted lg:block">Meta connected</span>
          </div>
        ) : (
          <a
            href="/api/meta/auth"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground-secondary hover:bg-hover hover:text-foreground transition-colors lg:px-3"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
            </svg>
            <span className="hidden lg:inline">Connect Meta</span>
          </a>
        )}
      </div>
    </nav>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
