"use client";
import type { AdvisorContext } from "@/lib/advisor";
import { isAdvisorContext } from "@/lib/advisor";
import { monthKey } from "@/lib/obligations";
import { financeUserId, readBudgetAndBills, readGoals, readFinancing } from "./finance";

export async function readAccountAdvisorContext():Promise<AdvisorContext> {
  const id=await financeUserId();
  const [account,goals,financing]=await Promise.all([
    readBudgetAndBills(id),readGoals(id),readFinancing(id)
  ]);
  const context:AdvisorContext={
    budget:account.budget,obligations:account.bills,goals,financing,month:monthKey()
  };
  if(!isAdvisorContext(context)) throw new Error("Account financial data is invalid.");
  return context;
}
