import type { Obligation } from "./obligations";
import { parseMoney } from "./money";

export const BUDGET_KEY = "moneyflow.budget.v1";
export const BUDGET_CHANGED = "moneyflow:budget-changed";
export const OBLIGATIONS_CHANGED = "moneyflow:obligations-changed";
export type BudgetSettings = { balanceCents: number; bufferCents: number };
export type BudgetResult = {
  availableCents: number;
  unpaidBillsCents: number;
  bufferCents: number;
  remainingCents: number;
  spendableCents: number;
  shortfallCents: number;
  unpaidCount: number;
};
export function validateBudget(balance: string, buffer: string): BudgetSettings {
  const balanceCents = parseMoney(balance);
  const bufferCents = parseMoney(buffer);
  return { balanceCents, bufferCents };
}
export function isBudgetSettings(value: unknown): value is BudgetSettings {
  if (!value || typeof value !== "object") return false;
  const b = value as Partial<BudgetSettings>;
  return typeof b.balanceCents === "number" && Number.isSafeInteger(b.balanceCents) && b.balanceCents >= 0 &&
    typeof b.bufferCents === "number" && Number.isSafeInteger(b.bufferCents) && b.bufferCents >= 0;
}
export function calculateBudget(settings: BudgetSettings, obligations: Obligation[], currentMonth: string): BudgetResult {
  if (!isBudgetSettings(settings)) throw new Error("Invalid budget settings");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(currentMonth)) throw new Error("Invalid month");
  const unpaid = obligations.filter(o => o.paidForMonth !== currentMonth);
  let unpaidBillsCents = 0;
  for (const o of unpaid) {
    if (!Number.isSafeInteger(o.amountCents) || o.amountCents < 0) throw new Error("Invalid obligation amount");
    unpaidBillsCents += o.amountCents;
    if (!Number.isSafeInteger(unpaidBillsCents)) throw new Error("Obligation total is too large");
  }
  const remainingCents = settings.balanceCents - unpaidBillsCents - settings.bufferCents;
  if (!Number.isSafeInteger(remainingCents)) throw new Error("Budget total is too large");
  return {
    availableCents: settings.balanceCents, unpaidBillsCents, bufferCents: settings.bufferCents,
    remainingCents, spendableCents: Math.max(0, remainingCents),
    shortfallCents: Math.max(0, -remainingCents), unpaidCount: unpaid.length
  };
}
