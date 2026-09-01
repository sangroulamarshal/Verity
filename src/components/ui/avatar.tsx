import * as React from "react";
import { cn } from "@/lib/utils";

// Deterministic color from string -- same string always gets same color.
// 8 colors sampled from a fintech-friendly palette that maintain 3:1+ contrast
// on #0A0A0A (the dark card surface).
const AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-violet-600 text-white",
  "bg-teal-600 text-white",
  "bg-orange-600 text-white",
  "bg-rose-600 text-white",
  "bg-indigo-600 text-white",
  "bg-emerald-700 text-white",
  "bg-amber-600 text-white",
];

function colorForString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

export function initialsFor(name: string | null | undefined, fallback: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase().slice(0, 2);
  }
  return fallback.slice(0, 2).toUpperCase();
}

interface AvatarProps {
  name?: string | null;
  email?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

export function Avatar({ name, email = "", size = "md", className }: AvatarProps) {
  const seed = name || email;
  const initials = initialsFor(name, email || "??");
  const color = colorForString(seed);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        SIZE_CLASSES[size],
        color,
        className
      )}
    >
      {initials}
    </span>
  );
}
