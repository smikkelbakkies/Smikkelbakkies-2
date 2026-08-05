import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function calculateUnitPrice(purchasePrice: number, packageContent: number) {
  if (!Number.isFinite(purchasePrice) || !Number.isFinite(packageContent) || packageContent <= 0) {
    return 0;
  }

  return purchasePrice / packageContent;
}

export function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function calculateGrossMargin(costPrice: number, sellingPrice: number) {
  if (!sellingPrice || sellingPrice <= 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}

