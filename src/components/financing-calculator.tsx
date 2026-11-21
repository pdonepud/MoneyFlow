"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { financeUserId, readBudgetAndBills, readFinancing } from "@/lib/supabase/finance";
import { BUDGET_CHANGED, calculateBudget, OBLIGATIONS_CHANGED, type BudgetSettings } from "@/lib/budget";
import { calculateFinancing, FINANCING_KEY, LOAN_TERMS, validateFinancing, type FinancingInputs } from "@/lib/financing";
import { formatMoney } from "@/lib/money";
import { monthKey, type Obligation } from "@/lib/obligations";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-indigo-600";
type FormState = { price:string; downPayment:string; apr:string; termMonths:number; insurance:string; fuel:string; maintenance:string };
const initial: FormState = {price:"",downPayment:"0",apr:"",termMonths:36,insurance:"0",fuel:"0",maintenance:"0"};
function fromInputs(i:FinancingInputs):FormState {
  return {price:(i.priceCents/100).toFixed(2),downPayment:(i.downPaymentCents/100).toFixed(2),
    apr:String(i.aprPercent),termMonths:i.termMonths,insurance:(i.insuranceCents/100).toFixed(2),
    fuel:(i.fuelCents/100).toFixed(2),maintenance:(i.maintenanceCents/100).toFixed(2)};
}
export function FinancingCalculator() {
  const [form,setForm]=useState<FormState>(initial);
  const [result,setResult]=useState<ReturnType<typeof calculateFinancing>|null>(null);
  const [inputs,setInputs]=useState<FinancingInputs|null>(null);
  const [budget,setBudget]=useState<BudgetSettings|null>(null);
  const [bills,setBills]=useState<Obligation[]>([]);
  const [month,setMonth]=useState("");
  const [error,setError]=useState("");
  const [storageError,setStorageError]=useState("");
  const [ready,setReady]=useState(false);
  const [userId,setUserId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [hasLocal,setHasLocal]=useState(false);
  const [notice,setNotice]=useState("");
  useEffect(() => {
  let active = true;

  async function checkLocalFinancing() {
    try {
      const raw = localStorage.getItem(FINANCING_KEY);

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        // Validate the saved financing estimate.
        calculateFinancing(parsed as FinancingInputs);

        if (active) {
          setHasLocal(true);
        }
      }
    } catch {
      if (active) {
        setStorageError(
          "Existing browser financing data could not be read; it was not changed."
        );
      }
    }
  }

  void checkLocalFinancing();
    async function refresh(){
      try{
        const id=await financeUserId();
        const [account,financing]=await Promise.all([readBudgetAndBills(id),readFinancing(id)]);
        if(!active)return;
        setUserId(id);setBudget(account.budget);setBills(account.bills);setMonth(monthKey());
        if(financing){setInputs(financing);setResult(calculateFinancing(financing));setForm(fromInputs(financing));}
      }catch(e){if(active)setStorageError(e instanceof Error?e.message:"Unable to load financing.");}
      finally{if(active)setReady(true);}
    }
    void refresh();
    const onChanged=()=>{void refresh();};
    window.addEventListener(BUDGET_CHANGED,onChanged);
    window.addEventListener(OBLIGATIONS_CHANGED,onChanged);
    return ()=>{
      active=false;
      window.removeEventListener(BUDGET_CHANGED,onChanged);
      window.removeEventListener(OBLIGATIONS_CHANGED,onChanged);
    };
  },[]);

  async function importLocal(){
    if(!userId||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const raw=localStorage.getItem(FINANCING_KEY);
      if(!raw)throw new Error("No browser estimate found.");
      const candidate:unknown=JSON.parse(raw);
      calculateFinancing(candidate as FinancingInputs);
      if(!window.confirm("Import browser financing estimate into THIS account? This replaces the account's current estimate. Browser copy stays unchanged."))return;
      await saveFinancing(candidate as FinancingInputs,userId);
      setInputs(candidate as FinancingInputs);setResult(calculateFinancing(candidate as FinancingInputs));
      setForm(fromInputs(candidate as FinancingInputs));setNotice("Browser estimate imported.");
    }catch(e){setError(e instanceof Error?e.message:"Import failed.");}
    finally{setBusy(false);}
  }
  async function saveFinancing(i:FinancingInputs,id:string){
    const {error:dbError}=await getSupabaseClient().from("financing_scenarios").upsert({
      user_id:id,price_cents:i.priceCents,down_payment_cents:i.downPaymentCents,
      apr_percent:i.aprPercent,term_months:i.termMonths,
      insurance_cents:i.insuranceCents,fuel_cents:i.fuelCents,
      maintenance_cents:i.maintenanceCents,updated_at:new Date().toISOString()
    },{onConflict:"user_id"});
    if(dbError)throw dbError;
  }
  function update(key:keyof FormState,value:string|number){
    setForm(old=>({...old,[key]:value}));setError("");setResult(null);setInputs(null);
  }
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!userId||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const validated=validateFinancing(form);
      const computed=calculateFinancing(validated);
      await saveFinancing(validated,userId);
      setInputs(validated);setResult(computed);setNotice("Estimate saved to your account.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to calculate financing.");}
    finally{setBusy(false);}
  }
  const snapshot=budget&&month?calculateBudget(budget,bills,month):null;
  const downPaymentFits=!!inputs&&!!snapshot&&inputs.downPaymentCents<=snapshot.spendableCents;
  return <section aria-labelledby="financing-heading" className="space-y-4">
    <div><h2 id="financing-heading" className="text-xl font-bold">Financing calculator</h2>
      <p className="mt-1 text-sm text-slate-600">Estimate the full cost of a purchase, including recurring ownership expenses. No loans are applied for and no money is transferred.</p></div>
    {hasLocal&&<div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm"><p>A financing estimate exists in this browser but was not assigned to an account.</p><button type="button" disabled={!ready||!userId||busy} onClick={()=>void importLocal()} className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-50">Import browser estimate</button></div>}
    {notice&&<p role="status" className="text-sm text-green-700">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Purchase and loan details</h3>
        <form onSubmit={(event)=>void submit(event)} className="space-y-4">
          {([
            ["price","Out-the-door purchase price (USD)","6000.00"],
            ["downPayment","Down payment (USD)","1000.00"],
            ["apr","Annual percentage rate (APR %)","11.74"],
            ["insurance","Monthly insurance (USD)","170.00"],
            ["fuel","Monthly fuel (USD)","30.00"],
            ["maintenance","Monthly maintenance (USD)","20.00"]
          ] as const).map(([key,label,placeholder])=><label key={key} className="block text-sm font-medium">{label}<input className={field} required inputMode="decimal" placeholder={placeholder} value={form[key]} onChange={e=>update(key,e.target.value)} disabled={!ready||!userId||busy}/></label>)}
          <label className="block text-sm font-medium">Loan term<select className={field} value={form.termMonths} onChange={e=>update("termMonths",Number(e.target.value))} disabled={!ready||!userId||busy}>{LOAN_TERMS.map(n=><option key={n} value={n}>{n} months</option>)}</select></label>
          {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={!ready||!userId||busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Calculate financing</button>
        </form>
      </Card>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Your financing estimate</h3>
        {storageError&&<p role="alert" className="mb-4 text-sm text-red-700">{storageError}</p>}
        {!result||!inputs?<p className="text-sm text-slate-500">Enter the purchase details and calculate to see your estimated payments.</p>:<>
          <p className="text-sm text-slate-500">Estimated monthly loan payment</p>
          <p className="mt-1 text-3xl font-bold">{formatMoney(result.monthlyPaymentCents)}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt>Amount financed</dt><dd className="font-semibold">{formatMoney(result.financedCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Monthly insurance, fuel and maintenance</dt><dd>{formatMoney(result.monthlyExtrasCents)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-3"><dt className="font-semibold">Total monthly ownership cost</dt><dd className="font-bold text-indigo-700">{formatMoney(result.monthlyOwnershipCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Estimated total loan payments</dt><dd>{formatMoney(result.totalLoanPaymentsCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Total loan interest</dt><dd>{formatMoney(result.totalInterestCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Down payment due upfront</dt><dd>{formatMoney(inputs.downPaymentCents)}</dd></div>
          </dl>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h4 className="font-semibold">Budget comparison</h4>
            {!snapshot?<p className="mt-2 text-sm text-slate-600">Save your manual budget to compare the upfront down payment against current unreserved funds.</p>:<>
              <p className="mt-2 text-sm">Unreserved funds right now: <strong>{formatMoney(snapshot.spendableCents)}</strong></p>
              <p className={`mt-2 text-sm ${downPaymentFits?"text-green-700":"text-red-700"}`}>{downPaymentFits?"Down payment fits your current unreserved funds.":"Down payment exceeds your current unreserved funds."}</p>
              {snapshot.shortfallCents>0&&<p className="mt-2 text-sm text-red-700">Your current budget has a {formatMoney(snapshot.shortfallCents)} shortfall.</p>}
            </>}
            <p className="mt-3 text-xs text-slate-500">Monthly affordability is not verified: your manual budget is a current balance, not recurring monthly income. Check future take-home income and all ongoing expenses before committing. Estimates exclude taxes or fees not included in your out-the-door price, and other costs you have not entered. Final loan payment may differ slightly due to rounding.</p>
          </div>
        </>}
      </Card>
    </div>
  </section>;
}
