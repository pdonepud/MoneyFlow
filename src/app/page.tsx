import { ArrowUpRight, CalendarDays, Goal, Wallet } from "lucide-react";
import { PaycheckManager } from "@/components/paycheck-manager";
import { Card } from "@/components/ui/card";
import { demo } from "@/lib/demo-data";
import { formatMoney } from "@/lib/money";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-600 p-2 text-white"><Wallet size={22} /></div><span className="text-xl font-bold tracking-tight">MoneyFlow</span></div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Bills & goals: demo data</span>
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
          <Card><div className="flex items-center justify-between text-sm text-slate-500"><span>Upcoming sample bills</span><CalendarDays size={19}/></div><p className="mt-4 text-3xl font-bold">{formatMoney(demo.upcomingObligations.reduce((sum, bill) => sum + bill.amountCents, 0))}</p><p className="mt-2 text-xs text-slate-500">Illustrative obligations only</p></Card>
          <Card><div className="flex items-center justify-between text-sm text-slate-500"><span>Spending allowance</span><ArrowUpRight size={19}/></div><p className="mt-4 text-2xl font-bold">Coming in Phase 2</p><p className="mt-2 text-xs text-slate-500">Requires your actual obligations and budget rules</p></Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="bills-heading">
            <div className="mb-4 flex items-center justify-between"><h2 id="bills-heading" className="text-xl font-bold">Upcoming bills</h2><span className="text-xs text-slate-500">Sample schedule</span></div>
            <Card className="divide-y divide-slate-100 !p-0">{demo.upcomingObligations.map((bill) => <div key={bill.name} className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium">{bill.name}</p><p className="mt-1 text-sm text-slate-500">Due {bill.due}</p></div><span className="font-semibold">{formatMoney(bill.amountCents)}</span></div>)}</Card>
          </section>
          <section aria-labelledby="goals-heading">
            <div className="mb-4 flex items-center justify-between"><h2 id="goals-heading" className="text-xl font-bold">Savings goals</h2><Goal className="text-slate-500" size={20}/></div>
            <Card className="space-y-7">{demo.goals.map((goal) => { const percent = Math.min(100, Math.round(goal.savedCents / goal.targetCents * 100)); return <div key={goal.name}><div className="mb-2 flex items-center justify-between gap-3"><span className="font-medium">{goal.name}</span><span className="text-sm text-slate-500">{percent}%</span></div><div role="progressbar" aria-label={goal.name} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${percent}%` }}/></div><p className="mt-2 text-sm text-slate-500">{formatMoney(goal.savedCents)} of {formatMoney(goal.targetCents)}</p></div>; })}</Card>
          </section>
        </div>
        <p className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900"><strong>Next up:</strong> Your paycheck entries are browser-local; bills and savings goals remain examples. Spending allowance calculations arrive in Phase 2.</p>
      </main>
    </div>
  );
}
