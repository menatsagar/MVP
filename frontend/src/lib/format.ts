import { COUNTRIES } from "./types";
import type { ExchangeRate } from "./types";

export function symbolFor(currency: string): string {
  const c = COUNTRIES.find((x) => x.currency === currency);
  if (c) return c.symbol;
  if (currency === "USD") return "$";
  return currency + " ";
}

export function formatLocal(amount: number, currency: string): string {
  const sym = symbolFor(currency);
  const formatted = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${sym} ${formatted}`;
}

export function toUsd(amount: number, currency: string, rates: ExchangeRate[]): number | null {
  const rate = rates.find((r) => r.code === currency);
  if (!rate) return null;
  return amount / rate.rateToUsd;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLocalWithUsd(
  amount: number,
  currency: string,
  rates: ExchangeRate[],
): string {
  const local = formatLocal(amount, currency);
  const usd = toUsd(amount, currency, rates);
  if (usd === null) return `${local} (USD: N/A ⚠)`;
  return `${local} (≈ ${formatUsd(usd)})`;
}
