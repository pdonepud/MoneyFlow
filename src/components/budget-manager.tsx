"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BUDGET_CHANGED, BUDGET_KEY, calculateBudget, isBudgetSettings, OBLIGATIONS_CHANGED, validateBudget, type BudgetSettings } from "@/lib/budget";
import { formatMoney } from "@/lib/money";
import { isObligation, monthKey, OBLIGATIONS_KEY, type Obligation } from "@/lib/obligations";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600";
const button = "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-indigo-600";

export function BudgetManager() {
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [balance, setBalance] = useState("");
  const [buffer, setBuffer] = useState("0");
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [month, setMonth] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    function refresh() {
      try {
        const rawBudget = localStorage.getItem(BUDGET_KEY);
        const rawObligations = localStorage.getItem(OBLIGATIONS_KEY);
        const parsedBudget: unknown = rawBudget ? JSON.parse(rawBudget) : null;
        const parsedObligations: unknown = rawObligations ? JSON.parse(rawObligations) : [];
        if (parsedBudget !== null && !isBudgetSettings(parsedBudget)) throw new Error("Invalid budget data");
        if (!Array.isArray(parsedObligations) || !parsedObligations.every(isObligation)) throw new Error("Invalid obligation data");
        setSettings(parsedBudget);
        if (parsedBudget) {
          setBalance((parsedBudget.balanceCents / 100).toFixed(2));
          setBuffer((parsedBudget.bufferCents / 100).toFixed(2));
        }
        setObligations(parsedObligations);
        setMonth(monthKey());
        setStorageError("");
      } catch {
        setStorageError("Unable to read saved budget or obligations. Existing data was not changed.");
      } finally { setLoaded(true); }
    }
    refresh();
    window.addEventListener(OBLIGATIONS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(BUDGET_CHANGED, refresh);
    return () => {
      window.removeEventListener(OBLIGATIONS_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(BUDGET_CHANGED, refresh);
    };
  }, []);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = validateBudget(balance, buffer);
      localStorage.setItem(BUDGET_KEY, JSON.stringify(next));
      setSettings(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save budget");
    }
  }
  const result = settings && month ? calculateBudget(settings, obligations, month) : null;
  return <section id="budget" aria-labelledby="budget-heading" className="space-y-4">
    <div><h2 id="budget-heading" className="text-xl font-bold">Your budget</h2>
      <p className="mt-1 text-sm text-slate-600">Enter money currently available to allocate, not total historical paychecks. Include only funds not already committed elsewhere.</p></div>
    {storageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{storageError}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Manual available balance</h3>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm font-medium">Available funds (USD)<input required inputMode="decimal" className={field} value={balance} onChange={e=>setBalance(e.target.value)} placeholder="1500.00" disabled={!loaded || !!storageError}/></label>
          <label className="block text-sm font-medium">Emergency buffer to reserve (USD)<input required inputMode="decimal" className={field} value={buffer} onChange={e=>setBuffer(e.target.value)} placeholder="100.00" disabled={!loaded || !!storageError}/></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className={button} type="submit" disabled={!loaded || !!storageError}>Save budget</button>
        </form>
        <p className="mt-4 text-xs text-slate-500">Your balance is a manual snapshot. Update it after spending, deposits, or payments. Marking a bill paid removes it from unpaid obligations, but does not automatically reduce your entered balance.</p>
      </Card>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Budget breakdown {month && <span className="text-sm font-normal text-slate-500">({month})</span>}</h3>
        {!loaded ? <p>Loading…</p> : !result ? <p className="text-sm text-slate-500">Save your available balance to see the breakdown.</p> : <>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt>Available funds</dt><dd className="font-semibold">{formatMoney(result.availableCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Unpaid monthly bills ({result.unpaidCount})</dt><dd>−{formatMoney(result.unpaidBillsCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Emergency buffer</dt><dd>−{formatMoney(result.bufferCents)}</dd></div>
          </dl>
          <div className="mt-5 border-t border-slate-200 pt-4"><p className="text-sm text-slate-500">Remaining after reserves</p>
            <p className={`mt-1 text-3xl font-bold ${result.remainingCents < 0 ? "text-red-700" : "text-green-700"}`}>{formatMoney(result.remainingCents)}</p>
            {result.shortfallCents > 0 ? <p className="mt-2 text-sm text-red-700">Shortfall: {formatMoney(result.shortfallCents)}. No safe spending amount is available under these assumptions.</p>
              : <p className="mt-2 text-sm text-slate-600">Estimated unallocated amount: {formatMoney(result.spendableCents)}. This is not a verified bank balance.</p>}
          </div>
        </>}
      </Card>
    </div>
  </section>;
}
