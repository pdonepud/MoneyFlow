"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BUDGET_CHANGED, BUDGET_KEY, calculateBudget, isBudgetSettings, OBLIGATIONS_CHANGED, type BudgetSettings } from "@/lib/budget";
import { calculateFinancing, FINANCING_KEY, LOAN_TERMS, validateFinancing, type FinancingInputs } from "@/lib/financing";
import { formatMoney } from "@/lib/money";
import { isObligation, monthKey, OBLIGATIONS_KEY, type Obligation } from "@/lib/obligations";

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
  useEffect(()=>{
    function refreshBudget(){
      try{
        const rawBudget=localStorage.getItem(BUDGET_KEY);
        const rawBills=localStorage.getItem(OBLIGATIONS_KEY);
        const b:unknown=rawBudget?JSON.parse(rawBudget):null;
        const o:unknown=rawBills?JSON.parse(rawBills):[];
        if(b!==null&&!isBudgetSettings(b)) throw new Error("Invalid budget");
        if(!Array.isArray(o)||!o.every(isObligation)) throw new Error("Invalid bills");
        setBudget(b);setBills(o);setMonth(monthKey());
        setStorageError("");
      }catch{setStorageError("Unable to read budget information for the comparison.");}
    }
    refreshBudget();
    try{
      const raw=localStorage.getItem(FINANCING_KEY);
      if(raw){
        const data:unknown=JSON.parse(raw);
        if(!data||typeof data!=="object") throw new Error("Invalid financing data");
        const candidate=data as FinancingInputs;
        const computed=calculateFinancing(candidate);
        setInputs(candidate);setResult(computed);setForm(fromInputs(candidate));
      }
    }catch{setStorageError("Unable to read saved financing estimate. Existing data was not changed.");}
    setReady(true);
    window.addEventListener(BUDGET_CHANGED,refreshBudget);
    window.addEventListener(OBLIGATIONS_CHANGED,refreshBudget);
    window.addEventListener("storage",refreshBudget);
    return ()=>{window.removeEventListener(BUDGET_CHANGED,refreshBudget);window.removeEventListener(OBLIGATIONS_CHANGED,refreshBudget);window.removeEventListener("storage",refreshBudget);};
  },[]);
  function update(key:keyof FormState,value:string|number){
    setForm(old=>({...old,[key]:value}));setError("");setResult(null);setInputs(null);
  }
  function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    try{
      const validated=validateFinancing(form);
      const computed=calculateFinancing(validated);
      localStorage.setItem(FINANCING_KEY,JSON.stringify(validated));
      setInputs(validated);setResult(computed);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to calculate financing.");}
  }
  const snapshot=budget&&month?calculateBudget(budget,bills,month):null;
  const downPaymentFits=!!inputs&&!!snapshot&&inputs.downPaymentCents<=snapshot.spendableCents;
  return <section aria-labelledby="financing-heading" className="space-y-4">
    <div><h2 id="financing-heading" className="text-xl font-bold">Financing calculator</h2>
      <p className="mt-1 text-sm text-slate-600">Estimate the full cost of a purchase, including recurring ownership expenses. No loans are applied for and no money is transferred.</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Purchase and loan details</h3>
        <form onSubmit={submit} className="space-y-4">
          {([
            ["price","Out-the-door purchase price (USD)","6000.00"],
            ["downPayment","Down payment (USD)","1000.00"],
            ["apr","Annual percentage rate (APR %)","11.74"],
            ["insurance","Monthly insurance (USD)","170.00"],
            ["fuel","Monthly fuel (USD)","30.00"],
            ["maintenance","Monthly maintenance (USD)","20.00"]
          ] as const).map(([key,label,placeholder])=><label key={key} className="block text-sm font-medium">{label}<input className={field} required inputMode="decimal" placeholder={placeholder} value={form[key]} onChange={e=>update(key,e.target.value)} disabled={!ready}/></label>)}
          <label className="block text-sm font-medium">Loan term<select className={field} value={form.termMonths} onChange={e=>update("termMonths",Number(e.target.value))} disabled={!ready}>{LOAN_TERMS.map(n=><option key={n} value={n}>{n} months</option>)}</select></label>
          {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={!ready} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Calculate financing</button>
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
