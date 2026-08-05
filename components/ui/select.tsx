import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20",
        className
      )}
      {...props}
    />
  );
}
