"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { readAccountAdvisorContext } from "@/lib/supabase/advisor-context";
import { getSupabaseClient } from "@/lib/supabase/client";
import { classifyFreeQuestion, FREE_TOPICS, freeAdviceForQuestion, type FreeTopic } from "@/lib/free-advisor";

type ChatMessage = { role:"user"|"assistant"; text:string };
const suggestions = [
  "Does my current budget support the down payment?",
  "What should I consider before financing a motorcycle?",
  "How do my savings goals affect this purchase?"
];

export function PurchaseAdvisor() {
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const [mode,setMode] = useState<"free"|"ai">("free");
  const [question,setQuestion] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function ask(value:string, forcedTopic?:FreeTopic) {
    const text=value.trim();
    if(!text||busy||text.length>1500)return;
    setBusy(true);setError("");
    try {
      const context=await readAccountAdvisorContext();
      const topic=forcedTopic??classifyFreeQuestion(text);
      let answer:string;
      if(mode==="free"||forcedTopic) {
        answer=topic?freeAdviceForQuestion(context,text,topic):
          "I can help with your budget, down payment, monthly financing costs, and savings goals. Choose a suggested question.";
      } else {
        const {data:sessionData,error:sessionError}=await getSupabaseClient().auth.getSession();
        if(sessionError||!sessionData.session?.access_token)throw new Error("Sign in to use the AI advisor.");
        const response=await fetch("/api/advisor",{
          method:"POST",
          headers:{"Content-Type":"application/json",Authorization:`Bearer ${sessionData.session.access_token}`},
          body:JSON.stringify({message:text})
        });
        const data:unknown=await response.json();
        if(!data||typeof data!=="object")throw new Error("Invalid server response.");
        const result=data as {answer?:unknown;error?:unknown};
        if(!response.ok||typeof result.answer!=="string")
          throw new Error(typeof result.error==="string"?result.error:"Unable to get advice.");
        answer=result.answer;
      }
      setMessages(old=>[...old,{role:"user",text},{role:"assistant",text:answer}]);
      setQuestion("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load account data.");}
    finally{setBusy(false);}
  }
  function askTopic(topic:FreeTopic) {
    const label=FREE_TOPICS.find(t=>t.id===topic)?.label??topic;
    void ask(label,topic);
  }
  function submit(e:FormEvent<HTMLFormElement>) { e.preventDefault(); void ask(question); }
  return <section aria-labelledby="advisor-heading" className="space-y-4">
    <div>
      <h2 id="advisor-heading" className="text-xl font-bold">Purchase advisor</h2>
      <p className="mt-1 text-sm text-slate-600">Ask about a purchase using your saved budget, bills, goals and financing estimate.</p>
    </div>
    <Card className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Advisor mode">
        <button type="button" aria-pressed={mode==="free"} disabled={busy} onClick={()=>{setMode("free");setError("");setMessages([]);}}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode==="free"?"bg-indigo-600 text-white":"border border-slate-300 text-slate-700"}`}>Free advisor</button>
        <button type="button" aria-pressed={mode==="ai"} disabled={busy} onClick={()=>{setMode("ai");setError("");setMessages([]);}}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode==="ai"?"bg-indigo-600 text-white":"border border-slate-300 text-slate-700"}`}>AI advisor (API credits)</button>
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        {mode==="free" ? "Free mode reads your account data from Supabase and calculates advice in your browser. No OpenAI API credits are required. It supports common budget, savings and financing questions, not unrestricted conversation." :
        "AI mode retrieves your account financial snapshot on the server and sends relevant amounts and goal names to the AI provider and requires separately billed API credits."}
        {" "}Figures are based on your entries, not bank-verified. Monthly affordability needs recurring income. No transactions are made.
      </div>
      {mode==="free" && <div className="flex flex-wrap gap-2">{FREE_TOPICS.map(t=>
        <button key={t.id} type="button" disabled={busy} onClick={()=>askTopic(t.id)} className="rounded-full border border-indigo-200 px-3 py-2 text-left text-sm text-indigo-700 hover:bg-indigo-50">{t.label}</button>
      )}</div>}
      <div aria-live="polite" className="max-h-96 space-y-3 overflow-y-auto">
        {messages.length===0 && mode==="ai" ? <div className="space-y-3">
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
