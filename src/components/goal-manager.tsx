"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { GOALS_CHANGED } from "@/lib/savings-plan";
import { GOALS_KEY, goalProgress, isSavingsGoal, validateGoal, type SavingsGoal } from "@/lib/goals";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600";

export function GoalManager() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (!Array.isArray(data) || !data.every(isSavingsGoal)) throw new Error("Invalid saved goals");
        setGoals(data);
      }
    } catch {
      setStorageError("Saved goals could not be read. Existing browser data was not changed.");
    } finally { setLoaded(true); }
  }, []);

  function persist(next: SavingsGoal[]) {
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify(next));
      setGoals(next);
      window.dispatchEvent(new Event(GOALS_CHANGED));
      setStorageError("");
      return true;
    } catch {
      setStorageError("Unable to save goals in this browser.");
      return false;
    }
  }
  function reset() {
    setName(""); setTarget(""); setSaved("0"); setEditingId(null); setError("");
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const values = validateGoal(name, target, saved);
      const next = editingId
        ? goals.map(g => g.id === editingId ? {...g,...values} : g)
        : [...goals,{...values,id:crypto.randomUUID()}];
      if (persist(next)) reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Invalid goal."); }
  }
  function edit(goal: SavingsGoal) {
    setName(goal.name); setTarget((goal.targetCents/100).toFixed(2)); setSaved((goal.savedCents/100).toFixed(2));
    setEditingId(goal.id); setError("");
    document.getElementById("goal-form")?.scrollIntoView({behavior:"smooth"});
  }
  return <section id="goals" aria-labelledby="goals-heading" className="space-y-4">
    <div><h2 id="goals-heading" className="text-xl font-bold">Savings goals</h2>
      <p className="mt-1 text-sm text-slate-600">Track separate savings for each goal. These balances do not change your available budget or move money between accounts.</p>
    </div>
    {storageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{storageError}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">{editingId ? "Edit savings goal" : "Add savings goal"}</h3>
        <form id="goal-form" onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">Goal name<input className={field} required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Motorcycle" disabled={!loaded || !!storageError}/></label>
          <label className="block text-sm font-medium">Target amount (USD)<input className={field} required inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)} placeholder="5000.00" disabled={!loaded || !!storageError}/></label>
          <label className="block text-sm font-medium">Amount already saved (USD)<input className={field} required inputMode="decimal" value={saved} onChange={e=>setSaved(e.target.value)} placeholder="250.00" disabled={!loaded || !!storageError}/></label>
          <p className="text-xs text-slate-500">Only enter money actually saved for this goal. Editing this number does not transfer money or update your budget balance.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={!loaded || !!storageError} className={`${button} bg-indigo-600 text-white disabled:opacity-50`}>{editingId ? "Save changes" : "Add goal"}</button>{editingId && <button type="button" className={button} onClick={reset}>Cancel</button>}</div>
        </form>
      </Card>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Your goals</h3>
        {!loaded ? <p>Loading…</p> : goals.length === 0 ? <p className="text-sm text-slate-500">No savings goals yet. Add your motorcycle or another purchase goal.</p> :
        <ul className="divide-y divide-slate-100">{goals.map(goal => {
          const progress = goalProgress(goal);
          return <li key={goal.id} className="space-y-3 py-4 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{goal.name}</span><span className="text-sm text-slate-600">{progress.percent}%</span></div>
            <div role="progressbar" aria-label={goal.name} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600" style={{width:`${progress.percent}%`}}/></div>
            <p className="text-sm text-slate-600">{formatMoney(goal.savedCents)} saved of {formatMoney(goal.targetCents)} · {progress.complete ? "Goal reached!" : `${formatMoney(progress.remainingCents)} to go`}</p>
            <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>edit(goal)}>Edit</button><button type="button" className={button} onClick={()=>setDeletingId(goal.id)}>Delete</button></div>
            {deletingId===goal.id && <div className="rounded-lg bg-red-50 p-3 text-sm"><p>Delete this goal? This removes the record, not actual money.</p><div className="mt-2 flex gap-2"><button type="button" className={`${button} bg-red-700 text-white`} onClick={()=>{if(persist(goals.filter(g=>g.id!==goal.id))){setDeletingId(null);if(editingId===goal.id)reset();}}}>Confirm delete</button><button type="button" className={button} onClick={()=>setDeletingId(null)}>Cancel</button></div></div>}
          </li>;
        })}</ul>}
      </Card>
    </div>
  </section>;
}
