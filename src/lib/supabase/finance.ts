"use client";
import { getSupabaseClient } from "./client";
import { isSavingsGoal, type SavingsGoal } from "@/lib/goals";
import { isBudgetSettings, type BudgetSettings } from "@/lib/budget";
import { isObligation, type Obligation } from "@/lib/obligations";
import { calculateFinancing, type FinancingInputs } from "@/lib/financing";

export async function financeUserId() {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) throw new Error("Sign in to access your financial data.");
  return data.user.id;
}
export async function readGoals(id: string): Promise<SavingsGoal[]> {
  const { data, error } = await getSupabaseClient().from("savings_goals")
    .select("id,name,target_cents,saved_cents").eq("user_id", id);
  if (error) throw error;
  const goals = (data ?? []).map(r => ({
    id: r.id as string, name: r.name as string,
    targetCents: Number(r.target_cents), savedCents: Number(r.saved_cents)
  }));
  if (!goals.every(isSavingsGoal)) throw new Error("Invalid goals from database.");
  return goals;
}
export async function readBudgetAndBills(id: string): Promise<{budget:BudgetSettings|null;bills:Obligation[]}> {
  const client = getSupabaseClient();
  const [b, o] = await Promise.all([
    client.from("budget_settings").select("balance_cents,buffer_cents").eq("user_id", id).maybeSingle(),
    client.from("obligations").select("id,name,category,amount_cents,due_day,paid_for_month").eq("user_id", id)
  ]);
  if (b.error) throw b.error;
  if (o.error) throw o.error;
  const budget = b.data ? { balanceCents: Number(b.data.balance_cents), bufferCents: Number(b.data.buffer_cents) } : null;
  const bills = (o.data ?? []).map(r => ({
    id:r.id as string, name:r.name as string, category:r.category as Obligation["category"],
    amountCents:Number(r.amount_cents),dueDay:Number(r.due_day),
    paidForMonth:r.paid_for_month as string|null
  }));
  if (budget && !isBudgetSettings(budget)) throw new Error("Invalid account budget.");
  if (!bills.every(isObligation)) throw new Error("Invalid account bills.");
  return {budget,bills};
}
export async function readFinancing(id: string): Promise<FinancingInputs|null> {
  const {data,error} = await getSupabaseClient().from("financing_scenarios")
    .select("price_cents,down_payment_cents,apr_percent,term_months,insurance_cents,fuel_cents,maintenance_cents")
    .eq("user_id",id).maybeSingle();
  if(error) throw error;
  if(!data) return null;
  const input:FinancingInputs = {
    priceCents:Number(data.price_cents),downPaymentCents:Number(data.down_payment_cents),
    aprPercent:Number(data.apr_percent),termMonths:Number(data.term_months),
    insuranceCents:Number(data.insurance_cents),fuelCents:Number(data.fuel_cents),
    maintenanceCents:Number(data.maintenance_cents)
  };
  calculateFinancing(input);
  return input;
}
