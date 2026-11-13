"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { BUDGET_KEY, isBudgetSettings } from "@/lib/budget";
import { FINANCING_KEY, calculateFinancing, type FinancingInputs } from "@/lib/financing";
import { GOALS_KEY, isSavingsGoal } from "@/lib/goals";
import { isObligation, monthKey, OBLIGATIONS_KEY } from "@/lib/obligations";
import { type AdvisorContext, isAdvisorContext } from "@/lib/advisor";

type ChatMessage = { role:"user"|"assistant"; text:string };
const suggestions = [
  "Does my current budget support the down payment?",
  "What should I consider before financing a motorcycle?",
  "How do my savings goals affect this purchase?"
];

function readContext(): AdvisorContext {
  const read = (key:string):unknown => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  };
  const budget = read(BUDGET_KEY);
  const bills = read(OBLIGATIONS_KEY) ?? [];
  const goals = read(GOALS_KEY) ?? [];
  const financing = read(FINANCING_KEY);
  if (budget !== null && !isBudgetSettings(budget)) throw new Error("Saved budget is invalid.");
  if (!Array.isArray(bills) || !bills.every(isObligation)) throw new Error("Saved bills are invalid.");
  if (!Array.isArray(goals) || !goals.every(isSavingsGoal)) throw new Error("Saved goals are invalid.");
  if (financing !== null) {
    try { calculateFinancing(financing as FinancingInputs); }
    catch { throw new Error("Saved financing estimate is invalid."); }
  }
  const context:AdvisorContext = {
    budget, obligations:bills, goals, financing:financing as FinancingInputs|null, month:monthKey()
  };
  if (!isAdvisorContext(context)) throw new Error("Your saved financial data could not be validated.");
  return context;
}

export function PurchaseAdvisor() {
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const [question,setQuestion] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function ask(value:string) {
    const text=value.trim();
    if (!text || busy || text.length>1500) return;
    setError("");
    let context:AdvisorContext;
    try { context=readContext(); }
    catch(e) { setError(e instanceof Error?e.message:"Unable to read saved data."); return; }
    setMessages(old=>[...old,{role:"user",text}]);
    setQuestion("");
    setBusy(true);
    try {
      const response=await fetch("/api/advisor",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:text,context})
      });
      const data:unknown=await response.json();
      if (!data || typeof data!=="object") throw new Error("Invalid server response.");
      const result=data as {answer?:unknown;error?:unknown};
      if (!response.ok || typeof result.answer!=="string") {
        throw new Error(typeof result.error==="string"?result.error:"Unable to get advice.");
      }
      setMessages(old=>[...old,{role:"assistant",text:result.answer as string}]);
    } catch(e) {
      setError(e instanceof Error?e.message:"Unable to contact the advisor.");
    } finally { setBusy(false); }
  }
  function submit(e:FormEvent<HTMLFormElement>) { e.preventDefault(); void ask(question); }
  return <section aria-labelledby="advisor-heading" className="space-y-4">
    <div>
      <h2 id="advisor-heading" className="text-xl font-bold">AI purchase advisor</h2>
      <p className="mt-1 text-sm text-slate-600">Ask about a purchase using your saved budget, bills, goals and financing estimate.</p>
    </div>
    <Card className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        Each question sends a snapshot of your saved financial amounts and goal names to the AI provider.
        Your data is user-entered, not bank-verified. No transactions or loan applications are made.
        Monthly affordability cannot be confirmed without recurring income.
      </div>
      <div aria-live="polite" className="max-h-96 space-y-3 overflow-y-auto">
        {messages.length===0 ? <div className="space-y-3">
          <p className="text-sm text-slate-600">Try one of these questions:</p>
          <div className="flex flex-wrap gap-2">{suggestions.map(s=>
            <button key={s} type="button" disabled={busy} onClick={()=>void ask(s)}
              className="rounded-full border border-indigo-200 px-3 py-2 text-left text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">{s}</button>
          )}</div>
        </div> : messages.map((m,i)=>
          <div key={i} className={`rounded-xl p-3 text-sm whitespace-pre-wrap ${m.role==="user"?"ml-6 bg-indigo-50 text-indigo-950":"mr-6 bg-slate-100 text-slate-900"}`}>
            <p className="mb-1 text-xs font-semibold">{m.role==="user"?"You":"MoneyFlow advisor"}</p>{m.text}
          </div>
        )}
        {busy && <p className="text-sm text-slate-500">Thinking…</p>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="advisor-question" className="sr-only">Your purchase question</label>
        <input id="advisor-question" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
          placeholder="Can I afford the down payment?" value={question} onChange={e=>setQuestion(e.target.value)}
          maxLength={1500} disabled={busy}/>
        <button type="submit" disabled={busy||!question.trim()} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Ask advisor</button>
      </form>
      <p className="text-xs text-slate-500">For planning and education only. Review all costs and loan terms before making a purchase.</p>
    </Card>
  </section>;
}
