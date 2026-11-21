"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { financeUserId, readGoals } from "@/lib/supabase/finance";
import { formatMoney } from "@/lib/money";
import { GOALS_CHANGED } from "@/lib/savings-plan";
import { GOALS_KEY, goalProgress, isSavingsGoal, validateGoal, type SavingsGoal } from "@/lib/goals";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600";

export function GoalManager() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userId,setUserId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [localCount,setLocalCount]=useState(0);
  const [notice,setNotice]=useState("");
  const [storageError, setStorageError] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

 useEffect(() => {
  let active = true;

  async function checkLocalGoals() {
    try {
      const raw = localStorage.getItem(GOALS_KEY);

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        if (!Array.isArray(parsed) || !parsed.every(isSavingsGoal)) {
          throw new Error("Invalid local goals");
        }

        if (active) {
          setLocalCount(parsed.length);
        }
      }
    } catch {
      if (active) {
        setStorageError(
          "Existing browser goals could not be read; no data was changed."
        );
      }
    }
  }

  void checkLocalGoals();
    async function load(){
      try {
        const id=await financeUserId();
        const data=await readGoals(id);
        if(active){setUserId(id);setGoals(data);window.dispatchEvent(new Event(GOALS_CHANGED));}
      }catch(e){if(active)setStorageError(e instanceof Error?e.message:"Unable to load goals.");}
      finally{if(active)setLoaded(true);}
    }
    void load();
    return ()=>{active=false;};
  },[]);

  async function refresh(id:string){
    setGoals(await readGoals(id));
    window.dispatchEvent(new Event(GOALS_CHANGED));
  }
  async function persist(next:SavingsGoal[]){
    if(!userId||busy)return false;
    setBusy(true);setError("");setNotice("");
    try {
      const client=getSupabaseClient();
      const oldIds=new Set(goals.map(g=>g.id));
      const nextIds=new Set(next.map(g=>g.id));
      for(const g of next){
        const record={user_id:userId,name:g.name,target_cents:g.targetCents,saved_cents:g.savedCents};
        const q=oldIds.has(g.id)?
          client.from("savings_goals").update(record).eq("user_id",userId).eq("id",g.id):
          client.from("savings_goals").insert({id:g.id,...record});
        const {error:dbError}=await q;
        if(dbError)throw dbError;
      }
      for(const old of goals)if(!nextIds.has(old.id)){
        const {error:dbError}=await client.from("savings_goals").delete().eq("user_id",userId).eq("id",old.id);
        if(dbError)throw dbError;
      }
      await refresh(userId);setNotice("Savings goals saved to your account.");return true;
    }catch(e){setError(e instanceof Error?e.message:"Unable to save goals.");return false;}
    finally{setBusy(false);}
  }
  async function importLocal(){
    if(!userId||busy)return;
    setBusy(true);setError("");setNotice("");
    try {
      const parsed:unknown=JSON.parse(localStorage.getItem(GOALS_KEY)??"[]");
      if(!Array.isArray(parsed)||!parsed.every(isSavingsGoal))throw new Error("Invalid browser goals.");
      if(!parsed.length)return;
      if(!window.confirm("Import browser savings goals into THIS account? Only proceed if they belong to you. Browser copies remain unchanged."))return;
      const client=getSupabaseClient();
      for(const g of parsed as SavingsGoal[]){
        const {data:existing,error:lookupError}=await client.from("savings_goals")
          .select("id").eq("user_id",userId).eq("id",g.id).maybeSingle();
        if(lookupError)throw lookupError;
        if(existing)continue;
        const {error:dbError}=await client.from("savings_goals").insert({
          id:g.id,user_id:userId,name:g.name,target_cents:g.targetCents,saved_cents:g.savedCents
        });
        if(dbError)throw dbError;
      }
      await refresh(userId);setNotice("Browser goals imported. Original copies preserved.");
    }catch(e){setError(e instanceof Error?e.message:"Import failed.");}
    finally{setBusy(false);}
  }
  function reset() {
    setName(""); setTarget(""); setSaved("0"); setEditingId(null); setError("");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const values = validateGoal(name, target, saved);
      const next = editingId
        ? goals.map(g => g.id === editingId ? {...g,...values} : g)
        : [...goals,{...values,id:crypto.randomUUID()}];
      if (await persist(next)) reset();
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
    {localCount>0&&<div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm"><p>Found {localCount} browser-stored goals, not assigned to an account.</p><button type="button" disabled={!loaded||!userId||busy} onClick={()=>void importLocal()} className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-50">Import browser goals</button></div>}
    {notice&&<p role="status" className="text-sm text-green-700">{notice}</p>}
    {storageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{storageError}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">{editingId ? "Edit savings goal" : "Add savings goal"}</h3>
        <form id="goal-form" onSubmit={(event)=>void submit(event)} className="space-y-4">
          <label className="block text-sm font-medium">Goal name<input className={field} required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Motorcycle" disabled={!loaded||!userId||busy}/></label>
          <label className="block text-sm font-medium">Target amount (USD)<input className={field} required inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)} placeholder="5000.00" disabled={!loaded||!userId||busy}/></label>
          <label className="block text-sm font-medium">Amount already saved (USD)<input className={field} required inputMode="decimal" value={saved} onChange={e=>setSaved(e.target.value)} placeholder="250.00" disabled={!loaded||!userId||busy}/></label>
          <p className="text-xs text-slate-500">Only enter money actually saved for this goal. Editing this number does not transfer money or update your budget balance.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2"><button type="submit" disabled={!loaded||!userId||busy} className={`${button} bg-indigo-600 text-white disabled:opacity-50`}>{editingId ? "Save changes" : "Add goal"}</button>{editingId && <button type="button" className={button} onClick={reset}>Cancel</button>}</div>
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
            <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={()=>edit(goal)}>Edit</button><button type="button" className={button} disabled={busy} onClick={()=>setDeletingId(goal.id)}>Delete</button></div>
            {deletingId===goal.id && <div className="rounded-lg bg-red-50 p-3 text-sm"><p>Delete this goal? This removes the record, not actual money.</p><div className="mt-2 flex gap-2"><button type="button" className={`${button} bg-red-700 text-white`} onClick={()=>{void (async()=>{if(await persist(goals.filter(g=>g.id!==goal.id))){setDeletingId(null);if(editingId===goal.id)reset();}})();}}>Confirm delete</button><button type="button" className={button} onClick={()=>setDeletingId(null)}>Cancel</button></div></div>}
          </li>;
        })}</ul>}
      </Card>
    </div>
  </section>;
}
