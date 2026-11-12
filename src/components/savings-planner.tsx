"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BUDGET_CHANGED, BUDGET_KEY, calculateBudget, isBudgetSettings, OBLIGATIONS_CHANGED, type BudgetSettings } from "@/lib/budget";
import { GOALS_KEY, isSavingsGoal, type SavingsGoal } from "@/lib/goals";
import { formatMoney } from "@/lib/money";
import { isObligation, monthKey, OBLIGATIONS_KEY, type Obligation } from "@/lib/obligations";
import { GOALS_CHANGED, PRIORITY_KEY, planSavings } from "@/lib/savings-plan";

const selectClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600";

export function SavingsPlanner() {
  const [goals,setGoals] = useState<SavingsGoal[]>([]);
  const [settings,setSettings] = useState<BudgetSettings | null>(null);
  const [obligations,setObligations] = useState<Obligation[]>([]);
  const [priorityId,setPriorityId] = useState("");
  const [loaded,setLoaded] = useState(false);
  const [error,setError] = useState("");
  const [month,setMonth] = useState("");

  useEffect(()=>{
    function refresh(){
      try{
        const rawGoals = localStorage.getItem(GOALS_KEY);
        const rawBudget = localStorage.getItem(BUDGET_KEY);
        const rawBills = localStorage.getItem(OBLIGATIONS_KEY);
        const parsedGoals: unknown = rawGoals ? JSON.parse(rawGoals) : [];
        const parsedBudget: unknown = rawBudget ? JSON.parse(rawBudget) : null;
        const parsedBills: unknown = rawBills ? JSON.parse(rawBills) : [];
        if (!Array.isArray(parsedGoals) || !parsedGoals.every(isSavingsGoal)) throw new Error("Invalid goals");
        if (parsedBudget !== null && !isBudgetSettings(parsedBudget)) throw new Error("Invalid budget");
        if (!Array.isArray(parsedBills) || !parsedBills.every(isObligation)) throw new Error("Invalid bills");
        setGoals(parsedGoals);
        setSettings(parsedBudget);
        setObligations(parsedBills);
        const stored = localStorage.getItem(PRIORITY_KEY) || "";
        const valid = parsedGoals.some(g=>g.id===stored);
        setPriorityId(valid ? stored : "");
        setMonth(monthKey());
        setError("");
      }catch{
        setError("Unable to read savings plan data. Existing browser data was not changed.");
      }finally{setLoaded(true);}
    }
    refresh();
    window.addEventListener(GOALS_CHANGED,refresh);
    window.addEventListener(BUDGET_CHANGED,refresh);
    window.addEventListener(OBLIGATIONS_CHANGED,refresh);
    window.addEventListener("storage",refresh);
    return ()=>{
      window.removeEventListener(GOALS_CHANGED,refresh);
      window.removeEventListener(BUDGET_CHANGED,refresh);
      window.removeEventListener(OBLIGATIONS_CHANGED,refresh);
      window.removeEventListener("storage",refresh);
    };
  },[]);

  function choose(id:string){
    try{
      if(id && !goals.some(g=>g.id===id)) return;
      if(id) localStorage.setItem(PRIORITY_KEY,id);
      else localStorage.removeItem(PRIORITY_KEY);
      setPriorityId(id);
      setError("");
    }catch{setError("Unable to save priority in this browser.");}
  }
  const budget = settings && month ? calculateBudget(settings,obligations,month) : null;
  const plan = budget ? planSavings(goals,priorityId || null,budget.spendableCents) : null;
  const chosen = goals.find(g=>g.id===plan?.priorityId);
  const recommendation = plan?.allocations[0]?.amountCents ?? 0;
  return <section aria-labelledby="savings-planner-heading" className="space-y-4">
    <div><h2 id="savings-planner-heading" className="text-xl font-bold">Savings planner</h2>
      <p className="mt-1 text-sm text-slate-600">Which goal should MoneyFlow prioritize? Choose one and see a suggested allocation from funds left after bills and your buffer.</p></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Card>
      <label className="block text-sm font-medium">Your top priority
        <select className={selectClass} value={priorityId} onChange={e=>choose(e.target.value)} disabled={!loaded || !!error}>
          <option value="">Choose a goal to prioritize</option>
          {goals.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </label>
      {!loaded ? <p className="mt-4 text-sm">Loading…</p>
        : goals.length===0 ? <p className="mt-4 text-sm text-slate-600">Add a savings goal first.</p>
        : !settings ? <p className="mt-4 text-sm text-slate-600">Save your manual available balance in Your budget to see recommendations.</p>
        : !priorityId ? <p className="mt-4 text-sm text-slate-600">Choose which goal you want to work toward first.</p>
        : !chosen ? <p className="mt-4 text-sm text-slate-600">Choose a valid goal.</p>
        : !plan?.priorityId ? <p className="mt-4 text-sm text-green-700">This goal is already fully funded. Choose another priority.</p>
        : <div className="mt-5 space-y-3">
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Available after bills and buffer</span><strong>{formatMoney(budget?.spendableCents ?? 0)}</strong></div>
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Suggested for {chosen.name}</span><strong className="text-indigo-700">{formatMoney(recommendation)}</strong></div>
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Left unallocated after suggestion</span><strong>{formatMoney(plan.unallocatedCents)}</strong></div>
          {budget && budget.shortfallCents>0 && <p className="text-sm text-red-700">Your budget has a {formatMoney(budget.shortfallCents)} shortfall. Save nothing until bills and buffer are covered.</p>}
          <p className="text-xs text-slate-500">This is a planning suggestion only, not a transfer. It assumes your manual balance is current and your separate goal savings are not included in that balance. Update your balance and saved goal amount yourself if you move money.</p>
        </div>}
    </Card>
  </section>;
}
