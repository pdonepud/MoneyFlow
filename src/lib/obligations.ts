import { parseMoney } from "./money";

export const OBLIGATIONS_KEY = "moneyflow.obligations.v1";
export const categories = ["your-rent", "family-rent", "phone", "credit-card-minimum", "utilities", "other"] as const;
export type Category = (typeof categories)[number];
export type Obligation = { id: string; name: string; category: Category; amountCents: number; dueDay: number; paidForMonth: string | null };
export const categoryLabels: Record<Category, string> = {
  "your-rent": "Your rent", "family-rent": "Family rent", phone: "Phone",
  "credit-card-minimum": "Credit card minimum", utilities: "Utilities", other: "Other"
};
export function monthKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function dueDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, Math.min(day, new Date(year, monthIndex + 1, 0).getDate()));
}
export function validateObligation(name: string, category: string, amount: string, dueDay: number) {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 80) throw new Error("Name must be between 1 and 80 characters.");
  if (!categories.includes(category as Category)) throw new Error("Choose a valid category.");
  const amountCents = parseMoney(amount);
  if (amountCents <= 0) throw new Error("Amount must be greater than zero.");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("Due day must be 1–31.");
  return { name: cleanName, category: category as Category, amountCents, dueDay };
}
export function isObligation(value: unknown): value is Obligation {
  if (!value || typeof value !== "object") return false;
  const o = value as Partial<Obligation>;
  return typeof o.id === "string" && o.id.length > 0 &&
    typeof o.name === "string" && o.name.trim().length > 0 && o.name.length <= 80 &&
    categories.includes(o.category as Category) &&
    typeof o.amountCents === "number" && Number.isSafeInteger(o.amountCents) && o.amountCents > 0 &&
    typeof o.dueDay === "number" && Number.isInteger(o.dueDay) && o.dueDay >= 1 && o.dueDay <= 31 &&
    (o.paidForMonth === null || (typeof o.paidForMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(o.paidForMonth)));
}
