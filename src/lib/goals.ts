import { parseMoney } from "./money";

export const GOALS_KEY = "moneyflow.goals.v1";
export type SavingsGoal = { id: string; name: string; targetCents: number; savedCents: number };

export function validateGoal(name: string, target: string, saved: string) {
  const clean = name.trim();
  if (!clean || clean.length > 80) throw new Error("Goal name must be 1–80 characters.");
  const targetCents = parseMoney(target);
  const savedCents = parseMoney(saved);
  if (targetCents <= 0) throw new Error("Target must be greater than zero.");
  return { name: clean, targetCents, savedCents };
}
export function isSavingsGoal(value: unknown): value is SavingsGoal {
  if (!value || typeof value !== "object") return false;
  const g = value as Partial<SavingsGoal>;
  return typeof g.id === "string" && g.id.length > 0 &&
    typeof g.name === "string" && g.name.trim().length > 0 && g.name.length <= 80 &&
    typeof g.targetCents === "number" && Number.isSafeInteger(g.targetCents) && g.targetCents > 0 &&
    typeof g.savedCents === "number" && Number.isSafeInteger(g.savedCents) && g.savedCents >= 0;
}
export function goalProgress(goal: SavingsGoal) {
  const remainingCents = Math.max(0, goal.targetCents - goal.savedCents);
  const percent = Math.min(100, Math.floor((goal.savedCents / goal.targetCents) * 100));
  return { remainingCents, percent, complete: remainingCents === 0 };
}
