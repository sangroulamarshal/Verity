"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timeAgo: string;
  href: string;
}

interface NotificationsPanelProps {
  notifications: NotificationItem[];
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function markRead(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
  }

  function markAllRead() {
    setReadIds(new Set(items.map((n) => n.id)));
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[340px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-[13px] font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <ul className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                No notifications
              </li>
            ) : (
              items.map((n) => {
                const isUnread = !readIds.has(n.id);
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => { markRead(n.id); setOpen(false); }}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 hover:bg-elevated transition-colors",
                        isUnread && "bg-elevated/40"
                      )}
                    >
                      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-risk-critical/15">
                        <ShieldAlert className="size-3.5 text-risk-critical" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{n.timeAgo}</p>
                      </div>
                      {isUnread && (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2">
            <Link
              href="/risk"
              onClick={() => setOpen(false)}
              className="text-[12px] text-primary hover:underline"
            >
              View all risk alerts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
