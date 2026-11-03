import { parseMoney } from "./money";

export type Paycheck = { id: string; date: string; amountCents: number; note: string };
export const STORAGE_KEY = "moneyflow.paychecks.v1";

export function localDateISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validatePaycheck(date: string, amount: string, note: string, today: string = localDateISO()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date) {
    throw new Error("Enter a valid paycheck date.");
  }
  if (date > today) throw new Error("Paycheck date cannot be in the future.");
  const amountCents = parseMoney(amount);
  if (amountCents <= 0) throw new Error("Paycheck must be greater than $0.");
  if (note.length > 200) throw new Error("Notes must be 200 characters or fewer.");
  return { date, amountCents, note: note.trim() };
}

export function sortPaychecks(entries: Paycheck[]): Paycheck[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function isPaycheck(value: unknown): value is Paycheck {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Paycheck>;
  return typeof p.id === "string" && p.id.length > 0 &&
    typeof p.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
    typeof p.amountCents === "number" && Number.isSafeInteger(p.amountCents) && p.amountCents > 0 &&
    typeof p.note === "string" && p.note.length <= 200;
}
