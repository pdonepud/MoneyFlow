import { ArrowUpRight, CalendarDays, Wallet } from "lucide-react";
import { PaycheckManager } from "@/components/paycheck-manager";
import { ObligationManager } from "@/components/obligation-manager";
import { BudgetManager } from "@/components/budget-manager";
import { GoalManager } from "@/components/goal-manager";
import { SavingsPlanner } from "@/components/savings-planner";
import { Card } from "@/components/ui/card";
import { demo } from "@/lib/demo-data";
import { formatMoney } from "@/lib/money";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-600 p-2 text-white"><Wallet size={22} /></div><span className="text-xl font-bold tracking-tight">MoneyFlow</span></div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Sample bills: demo data</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <section>
          <p className="mb-2 text-sm font-semibold text-indigo-600">YOUR FINANCIAL OVERVIEW</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Make every paycheck count.</h1>
          <p className="mt-3 max-w-2xl text-slate-600">A simple place to organize paychecks, bills, and the things you are saving for.</p>
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PaycheckManager />
          <Card><div className="flex items-center justify-between text-sm text-slate-500"><span>Sample bills (reference only)</span><CalendarDays size={19}/></div><p className="mt-4 text-3xl font-bold">{formatMoney(demo.upcomingObligations.reduce((sum, bill) => sum + bill.amountCents, 0))}</p><p className="mt-2 text-xs text-slate-500">Illustrative obligations only</p></Card>
          <Card><div className="flex items-center justify-between text-sm text-slate-500"><span>Budget estimate</span><ArrowUpRight size={19}/></div><p className="mt-4 text-2xl font-bold">See budget below</p><p className="mt-2 text-xs text-slate-500">Enter your available balance below</p></Card>
        </div>
        <BudgetManager />
        <ObligationManager />
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="bills-heading">
            <div className="mb-4 flex items-center justify-between"><h2 id="bills-heading" className="text-xl font-bold">Sample bills</h2><span className="text-xs text-slate-500">Sample schedule</span></div>
            <Card className="divide-y divide-slate-100 !p-0">{demo.upcomingObligations.map((bill) => <div key={bill.name} className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium">{bill.name}</p><p className="mt-1 text-sm text-slate-500">Due {bill.due}</p></div><span className="font-semibold">{formatMoney(bill.amountCents)}</span></div>)}</Card>
          </section>

        </div>
        <GoalManager />
        <SavingsPlanner />
        <p className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900"><strong>Next up:</strong> Your paychecks, monthly obligations, and manual budget are stored in this browser. Sample bills are illustrative only. Savings goals are tracked separately from your available balance. The savings planner recommends allocations only; it does not transfer money.</p>
      </main>
    </div>
  );
}
