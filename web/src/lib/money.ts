const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "$0.00";
  return formatter.format(amount);
}

export function parseMoney(input: unknown): number {
  if (typeof input === "number") return input;
  if (typeof input === "string" && input.trim() !== "") {
    const n = Number(input);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
