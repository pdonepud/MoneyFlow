"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
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
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasLocalBudget, setHasLocalBudget] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let active=true;
    setMonth(monthKey());
    try {
      const raw=localStorage.getItem(BUDGET_KEY);
      if(raw) {
        const parsed:unknown=JSON.parse(raw);
        if(!isBudgetSettings(parsed)) throw new Error("Invalid browser budget");
        setHasLocalBudget(true);
      }
    } catch {setStorageError("Existing browser budget could not be read; it was not changed.");}
    async function refreshBills(id:string) {
      const {data,error:dbError}=await getSupabaseClient().from("obligations")
        .select("id,name,category,amount_cents,due_day,paid_for_month").eq("user_id",id);
      if(dbError) throw dbError;
      const next=(data??[]).map(row=>({
        id:row.id as string,name:row.name as string,category:row.category as Obligation["category"],
        amountCents:Number(row.amount_cents),dueDay:Number(row.due_day),
        paidForMonth:row.paid_for_month as string|null
      }));
      if(!next.every(isObligation)) throw new Error("Invalid bills returned from database.");
      if(active) setObligations(next);
    }
    async function load() {
      try {
        const client=getSupabaseClient();
        const {data:auth,error:authError}=await client.auth.getUser();
        if(authError||!auth.user) throw new Error("Sign in to load your budget.");
        const id=auth.user.id;
        const {data,error:dbError}=await client.from("budget_settings")
          .select("balance_cents,buffer_cents").eq("user_id",id).maybeSingle();
        if(dbError) throw dbError;
        const next=data?{balanceCents:Number(data.balance_cents),bufferCents:Number(data.buffer_cents)}:null;
        if(next&&!isBudgetSettings(next)) throw new Error("Invalid budget returned from database.");
        await refreshBills(id);
        if(active) {
          setUserId(id);setSettings(next);
          if(next) {setBalance((next.balanceCents/100).toFixed(2));setBuffer((next.bufferCents/100).toFixed(2));}
          window.dispatchEvent(new Event(BUDGET_CHANGED));
        }
      } catch(e) {if(active) setStorageError(e instanceof Error?e.message:"Unable to load budget.");}
      finally {if(active) setLoaded(true);}
    }
    void load();
    async function onBillsChanged() {
      try {
        const {data:auth}=await getSupabaseClient().auth.getUser();
        if(auth.user) await refreshBills(auth.user.id);
      } catch(e) {if(active) setStorageError(e instanceof Error?e.message:"Unable to refresh bills.");}
    }
    window.addEventListener(OBLIGATIONS_CHANGED,onBillsChanged);
    return ()=>{active=false;window.removeEventListener(OBLIGATIONS_CHANGED,onBillsChanged);};
  }, []);

  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!userId||busy) return;
    setBusy(true);setError("");setNotice("");
    try {
      const next=validateBudget(balance,buffer);
      const {error:dbError}=await getSupabaseClient().from("budget_settings").upsert({
        user_id:userId,balance_cents:next.balanceCents,buffer_cents:next.bufferCents,
        updated_at:new Date().toISOString()
      },{onConflict:"user_id"});
      if(dbError) throw dbError;
      setSettings(next);window.dispatchEvent(new Event(BUDGET_CHANGED));
      setNotice("Budget saved to your account.");
    } catch(e) {setError(e instanceof Error?e.message:"Unable to save budget.");}
    finally {setBusy(false);}
  }

  async function importLocal() {
    if(!userId||busy) return;
    setBusy(true);setError("");setNotice("");
    try {
      const raw=localStorage.getItem(BUDGET_KEY);
      if(!raw) throw new Error("No browser budget found.");
      const parsed:unknown=JSON.parse(raw);
      if(!isBudgetSettings(parsed)) throw new Error("Invalid browser budget.");
      if(!window.confirm("Import browser budget into THIS account? This replaces the account's current budget if one exists. Browser copy stays unchanged.")) return;
      const {error:dbError}=await getSupabaseClient().from("budget_settings").upsert({
        user_id:userId,balance_cents:parsed.balanceCents,buffer_cents:parsed.bufferCents,
        updated_at:new Date().toISOString()
      },{onConflict:"user_id"});
      if(dbError) throw dbError;
      setSettings(parsed);setBalance((parsed.balanceCents/100).toFixed(2));
      setBuffer((parsed.bufferCents/100).toFixed(2));
      window.dispatchEvent(new Event(BUDGET_CHANGED));
      setNotice("Browser budget imported. Original copy preserved.");
    } catch(e) {setError(e instanceof Error?e.message:"Unable to import budget.");}
    finally {setBusy(false);}
  }
  const result = settings && month ? calculateBudget(settings, obligations, month) : null;
  return <section id="budget" aria-labelledby="budget-heading" className="space-y-4">
    <div><h2 id="budget-heading" className="text-xl font-bold">Your budget</h2>
      <p className="mt-1 text-sm text-slate-600">Enter money currently available to allocate, not total historical paychecks. Include only funds not already committed elsewhere.</p></div>
    {hasLocalBudget&&<div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm"><p>A budget is saved in this browser. It has not been assigned to your account.</p><button type="button" disabled={!loaded||!userId||busy} onClick={()=>void importLocal()} className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white disabled:opacity-50">Import browser budget</button></div>}
    {notice&&<p role="status" className="text-sm text-green-700">{notice}</p>}
    {storageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{storageError}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Manual available balance</h3>
        <form onSubmit={(event)=>void save(event)} className="space-y-4">
          <label className="block text-sm font-medium">Available funds (USD)<input required inputMode="decimal" className={field} value={balance} onChange={e=>setBalance(e.target.value)} placeholder="1500.00" disabled={!loaded||!userId||busy}/></label>
          <label className="block text-sm font-medium">Emergency buffer to reserve (USD)<input required inputMode="decimal" className={field} value={buffer} onChange={e=>setBuffer(e.target.value)} placeholder="100.00" disabled={!loaded||!userId||busy}/></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button className={button} type="submit" disabled={!loaded||!userId||busy}>Save budget</button>
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
