"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { OBLIGATIONS_CHANGED } from "@/lib/budget";
import { categories, categoryLabels, dueDate, isObligation, monthKey, OBLIGATIONS_KEY, validateObligation, type Category, type Obligation } from "@/lib/obligations";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600";

export function ObligationManager() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("your-rent");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    setCurrentMonth(monthKey());
    try {
      const raw = localStorage.getItem(OBLIGATIONS_KEY);
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (!Array.isArray(data) || !data.every(isObligation)) throw new Error("Invalid saved data");
        setItems(data);
      }
    } catch {
      setStorageError("Saved obligations could not be read. Existing browser data was not changed.");
    } finally { setLoaded(true); }
  }, []);

  function persist(next: Obligation[]) {
    try {
      localStorage.setItem(OBLIGATIONS_KEY, JSON.stringify(next));
      setItems(next);
      window.dispatchEvent(new Event(OBLIGATIONS_CHANGED));
      setStorageError("");
      return true;
    } catch {
      setStorageError("Unable to save obligations in this browser.");
      return false;
    }
  }
  function reset() {
    setName(""); setCategory("your-rent"); setAmount(""); setDay("1"); setEditingId(null); setError("");
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const values = validateObligation(name, category, amount, Number(day));
      const next = editingId
        ? items.map(o => o.id === editingId ? {...o,...values} : o)
        : [...items,{...values,id:crypto.randomUUID(),paidForMonth:null}];
      if (persist(next)) reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Invalid obligation."); }
  }
  function edit(o: Obligation) {
    setName(o.name); setCategory(o.category); setAmount((o.amountCents / 100).toFixed(2));
    setDay(String(o.dueDay)); setEditingId(o.id); setError("");
    document.getElementById("obligation-form")?.scrollIntoView({behavior:"smooth"});
  }

  const ordered = [...items].sort((a,b)=>a.dueDay-b.dueDay || a.name.localeCompare(b.name));
  const unpaid = items.filter(o=>o.paidForMonth!==currentMonth);
  const unpaidTotal = unpaid.reduce((sum,o)=>sum+o.amountCents,0);
  const now = new Date();

  return <section id="obligations" aria-labelledby="obligations-heading" className="space-y-4">
    <div><h2 id="obligations-heading" className="text-xl font-bold">Monthly obligations</h2>
      <p className="mt-1 text-sm text-slate-600">Track recurring monthly bills. Payments are marked for the current month only. Data is stored in this browser.</p>
    </div>
    {storageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{storageError}</p>}
    <Card><p className="text-sm text-slate-500">Unpaid bills — {currentMonth || "current month"}</p>
      <p className="mt-2 text-2xl font-bold">{loaded ? formatMoney(unpaidTotal) : "Loading…"}</p>
      <p className="mt-1 text-xs text-slate-500">This is not your spending allowance. Paycheck allocations are not calculated yet.</p>
    </Card>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">{editingId ? "Edit obligation" : "Add obligation"}</h3>
        <form id="obligation-form" onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">Bill name<input className={field} required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Brother's rent" disabled={!loaded || !!storageError}/></label>
          <label className="block text-sm font-medium">Category<select className={field} value={category} onChange={e=>setCategory(e.target.value as Category)} disabled={!loaded || !!storageError}>{categories.map(c=><option key={c} value={c}>{categoryLabels[c]}</option>)}</select></label>
          <label className="block text-sm font-medium">Monthly amount (USD)<input className={field} required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="650.00" disabled={!loaded || !!storageError}/></label>
          <label className="block text-sm font-medium">Day of month due (1–31)<input className={field} required type="number" min={1} max={31} step={1} value={day} onChange={e=>setDay(e.target.value)} disabled={!loaded || !!storageError}/></label>
          <p className="text-xs text-slate-500">For short months, days 29–31 are treated as the last day of the month.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={!loaded || !!storageError} className={`${button} bg-indigo-600 text-white disabled:opacity-50`}>{editingId?"Save changes":"Add obligation"}</button>{editingId&&<button type="button" className={button} onClick={reset}>Cancel</button>}</div>
        </form>
      </Card>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Bill list</h3>
        {!loaded?<p>Loading…</p>:ordered.length===0?<p className="text-slate-500">No bills yet. Add rent, a phone bill, or a credit-card minimum payment.</p>:
          <ul className="divide-y divide-slate-100">{ordered.map(o=>{
            const paid=o.paidForMonth===currentMonth;
            const due=dueDate(now.getFullYear(),now.getMonth(),o.dueDay);
            return <li key={o.id} className="space-y-2 py-4 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{o.name}</p><p className="text-sm text-slate-500">{categoryLabels[o.category]} · Due {due.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p></div><span className="font-semibold">{formatMoney(o.amountCents)}</span></div>
              <div className="flex flex-wrap gap-2"><button type="button" disabled={!!storageError} className={`${button} ${paid?"border-green-300 bg-green-50 text-green-800":""}`} onClick={()=>persist(items.map(x=>x.id===o.id?{...x,paidForMonth:paid?null:currentMonth}:x))}>{paid?"Paid this month ✓":"Mark paid"}</button>
                <button type="button" className={button} onClick={()=>edit(o)}>Edit</button>
                <button type="button" className={button} onClick={()=>setDeletingId(o.id)}>Delete</button></div>
              {deletingId===o.id&&<div className="rounded-lg bg-red-50 p-3 text-sm"><p>Delete this recurring bill? This cannot be undone.</p><div className="mt-2 flex gap-2"><button type="button" className={`${button} bg-red-700 text-white`} onClick={()=>{if(persist(items.filter(x=>x.id!==o.id))){setDeletingId(null);if(editingId===o.id)reset();}}}>Confirm delete</button><button type="button" className={button} onClick={()=>setDeletingId(null)}>Cancel</button></div></div>}
            </li>;
          })}</ul>}
      </Card>
    </div>
  </section>;
}
