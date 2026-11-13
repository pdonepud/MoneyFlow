import { calculateBudget } from "./budget";
import { calculateFinancing } from "./financing";
import { goalProgress } from "./goals";
import { formatMoney } from "./money";
import type { AdvisorContext } from "./advisor";
import { isAdvisorContext } from "./advisor";

export const FREE_TOPICS = [
  { id:"down-payment", label:"Can I afford the down payment?" },
  { id:"monthly-cost", label:"What will this purchase cost monthly?" },
  { id:"budget", label:"How is my budget looking?" },
  { id:"goals", label:"How are my savings goals progressing?" }
] as const;
export type FreeTopic = typeof FREE_TOPICS[number]["id"];
export function classifyFreeQuestion(question:string):FreeTopic|null {
  const q=question.toLowerCase().trim();
  if (!q) return null;
  // Assess affordability before loan-payment keywords: "downpayment" contains "payment".
  if (/down[\\s-]*payment|down[\\s-]*pay|\\$?[\\d,]+(?:\\.\\d{1,2})?\\s*(?:dollars?\\s*)?down\\b|up[\\s-]*front|afford|can i buy|should i buy|can i purchase/.test(q)) return "down-payment";
  if (/goal|saving|save up|progress|priority/.test(q)) return "goals";
  if (/monthly|per month|payment|interest|apr|loan|financ|insurance|ownership/.test(q)) return "monthly-cost";
  if (/budget|bill|rent|buffer|spend|balance|left over|remaining/.test(q)) return "budget";
  if (/buy|purchase|motorcycle|bike/.test(q)) return "down-payment";
  return null;
}

// Extract only an explicitly stated down payment, not the purchase price.
// Supports "$1,000 down", "1000$ downpayment" and "down payment of $1000".
export function statedDownPayment(question:string):number|null {
  const amount=String.raw`(?:\\$\\s*([\\d,]+(?:\\.\\d{1,2})?)|([\\d,]+(?:\\.\\d{1,2})?)\\s*\\$?)`;
  const before=new RegExp(amount+String.raw`\\s*(?:dollars?\\s*)?(?:as\\s+(?:a|the)\\s+)?down[\\s-]*(?:payment|pay)?\\b`,"i");
  const after=new RegExp(String.raw`down[\\s-]*(?:payment|pay)\\s*(?:of|is|:)?\\s*`+amount,"i");
  const match=question.match(before) ?? question.match(after);
  if (!match) return null;
  const raw=match[1]??match[2];
  const value=Number(raw.replace(/,/g,""));
  if (!Number.isFinite(value)||value<0||value>1_000_000) return null;
  return Math.round(value*100);
}

export function freeAdviceForQuestion(context:AdvisorContext,question:string,topic:FreeTopic):string {
  const answer=freeAdvice(context,topic);
  if (topic!=="down-payment" || !context.financing) return answer;
  const stated=statedDownPayment(question);
  if (stated===null || stated===context.financing.downPaymentCents) return answer;
  return "You mentioned a "+formatMoney(stated)+" down payment, but your saved financing estimate uses "+formatMoney(context.financing.downPaymentCents)+". The figures below use the saved estimate, not the amount in your question. Update the financing calculator and ask again for an accurate comparison.\\n\\n"+answer;
}
export function freeAdvice(context:AdvisorContext,topic:FreeTopic):string {
  if (!isAdvisorContext(context)) throw new Error("Invalid financial context");
  const b=context.budget ? calculateBudget(context.budget,context.obligations,context.month) : null;
  const f=context.financing ? calculateFinancing(context.financing) : null;
  if (topic==="budget") {
    if (!b) return "Save your available balance and emergency buffer in Your budget first. I'll then compare them with your unpaid bills.";
    return [
      "Current manually entered balance: "+formatMoney(b.availableCents)+".",
      "Unpaid bills this month: "+formatMoney(b.unpaidBillsCents)+" ("+b.unpaidCount+" bills).",
      "Emergency buffer: "+formatMoney(b.bufferCents)+".",
      "Unreserved funds: "+formatMoney(b.spendableCents)+".",
      b.shortfallCents>0 ? "Warning: you have a "+formatMoney(b.shortfallCents)+" shortfall. Cover bills and your buffer before making optional purchases." : "Your entered balance currently covers the listed unpaid bills and buffer.",
      "This is a snapshot, not a recurring monthly cash-flow forecast. Update your balance after transactions."
    ].join("\n");
  }
  if (topic==="goals") {
    if (!context.goals.length) return "You haven't saved any goals yet. Add a savings goal to see progress and how much remains.";
    const lines=context.goals.map(g=>{
      const p=goalProgress(g);
      return g.name+": "+formatMoney(g.savedCents)+" saved of "+formatMoney(g.targetCents)+" ("+p.percent+"%); "+formatMoney(p.remainingCents)+" remaining.";
    });
    lines.push("Goal savings are tracked separately from your manual available balance; don't count them twice.");
    if (b && b.shortfallCents>0) lines.push("Your current budget has a "+formatMoney(b.shortfallCents)+" shortfall. Prioritize bills and buffer before adding savings.");
    return lines.join("\n");
  }
  if (topic==="monthly-cost") {
    if (!context.financing || !f) return "Calculate and save a financing estimate first. I'll then explain the loan payment, insurance, fuel and maintenance costs.";
    return [
      "Estimated monthly loan payment: "+formatMoney(f.monthlyPaymentCents)+".",
      "Insurance, fuel and maintenance: "+formatMoney(f.monthlyExtrasCents)+" per month.",
      "Estimated total monthly ownership cost: "+formatMoney(f.monthlyOwnershipCents)+".",
      "Estimated loan interest over "+context.financing.termMonths+" months: "+formatMoney(f.totalInterestCents)+".",
      "This is not a monthly affordability verdict: your current balance isn't recurring income. Compare these costs against reliable monthly take-home pay and all ongoing expenses."
    ].join("\n");
  }
  if (!context.financing || !f) return "Calculate and save your financing estimate first so I can check its down payment against your budget.";
  if (!b) return "Save your manual available balance and emergency buffer first. The planned down payment is "+formatMoney(context.financing.downPaymentCents)+", but I can't compare it with unreserved funds yet.";
  const down=context.financing.downPaymentCents;
  const gap=Math.max(0,down-b.spendableCents);
  return [
    "Planned down payment: "+formatMoney(down)+".",
    "Current unreserved funds after unpaid bills and buffer: "+formatMoney(b.spendableCents)+".",
    gap>0 ? "The down payment exceeds your unreserved funds by "+formatMoney(gap)+". I would wait until your bills and buffer are covered." : "The down payment fits your current unreserved funds, based on the amounts you've entered.",
    b.shortfallCents>0 ? "Your budget also has a "+formatMoney(b.shortfallCents)+" shortfall." : "",
    "Estimated total monthly ownership cost: "+formatMoney(f.monthlyOwnershipCents)+".",
    "Even if the down payment fits, monthly affordability is unknown without recurring income and expense data. No money is moved."
  ].filter(Boolean).join("\n");
}
