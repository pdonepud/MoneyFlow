import type { SavingsGoal } from "./goals";
import { goalProgress } from "./goals";
export const PRIORITY_KEY = "moneyflow.priority-goal.v1";
export const GOALS_CHANGED = "moneyflow:goals-changed";

export type SavingsPlan = {
  priorityId: string | null;
  availableToPlanCents: number;
  allocations: { goalId: string; amountCents: number }[];
  unallocatedCents: number;
};
export function planSavings(goals: SavingsGoal[], priorityId: string | null, spendableCents: number): SavingsPlan {
  if (!Number.isSafeInteger(spendableCents) || spendableCents < 0) throw new Error("Invalid spendable amount");
  const chosen = goals.find(g => g.id === priorityId);
  if (!chosen || goalProgress(chosen).complete) {
    return { priorityId: null, availableToPlanCents: spendableCents, allocations: [], unallocatedCents: spendableCents };
  }
  const amountCents = Math.min(spendableCents, goalProgress(chosen).remainingCents);
  return {
    priorityId: chosen.id,
    availableToPlanCents: spendableCents,
    allocations: [{ goalId: chosen.id, amountCents }],
    unallocatedCents: spendableCents - amountCents
  };
}
