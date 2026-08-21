import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve conflicting Tailwind utility
 * classes (e.g. "p-2 p-4" -> "p-4"). Used by every UI primitive.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
