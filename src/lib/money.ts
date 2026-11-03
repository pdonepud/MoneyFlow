/** Financial values are stored as integer cents, never floating-point dollars. */
export type Cents = number;

export function formatMoney(cents: Cents): string {
  if (!Number.isSafeInteger(cents)) throw new Error("Amount must be an integer number of cents");
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function parseMoney(value: string): Cents {
  const cleaned = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(cleaned)) throw new Error("Enter a non-negative amount with at most two decimal places");
  const [dollars, fraction = ""] = cleaned.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("Amount is too large");
  return cents;
}
