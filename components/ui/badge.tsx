import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger";
};

const tones = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success/30 bg-success/12 text-success",
  warning: "border-gold/30 bg-gold/12 text-gold",
  danger: "border-destructive/30 bg-destructive/12 text-destructive"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone], className)} {...props} />;
}
