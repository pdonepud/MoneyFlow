"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { isPaycheck, localDateISO, sortPaychecks, STORAGE_KEY, validatePaycheck, type Paycheck } from "@/lib/paychecks";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const action = "rounded-lg px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export function PaycheckManager() {
  const [items, setItems] = useState<Paycheck[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setToday(localDateISO());
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(isPaycheck)) throw new Error("Invalid saved paycheck data");
        setItems(sortPaychecks(parsed));
      }
    } catch {
      setStorageError("Saved paycheck data could not be read. Existing browser data was not changed.");
    } finally {
      setLoaded(true);
    }
  }, []);

  function persist(next: Paycheck[]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setItems(sortPaychecks(next));
      setStorageError("");
      return true;
    } catch {
      setStorageError("Unable to save paychecks in this browser. Check storage settings or available space.");
      return false;
    }
  }

  function reset() {
    setEditingId(null);
    setDate("");
    setAmount("");
    setNote("");
    setError("");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const values = validatePaycheck(date, amount, note, localDateISO());
      const next = editingId
        ? items.map((item) => item.id === editingId ? { ...item, ...values } : item)
        : [...items, { id: crypto.randomUUID(), ...values }];
      if (persist(next)) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the paycheck details.");
    }
  }

  function edit(item: Paycheck) {
    setEditingId(item.id);
    setDate(item.date);
    setAmount((item.amountCents / 100).toFixed(2));
    setNote(item.note);
    setError("");
    document.getElementById("paycheck-form")?.scrollIntoView({ behavior: "smooth" });
  }

  const latest = sortPaychecks(items)[0];

  return (
    <>
      <Card>
        <div className="flex items-center justify-between text-sm text-slate-500"><span>Latest paycheck</span><CircleDollarSign size={19} /></div>
        <p className="mt-4 text-3xl font-bold">{!loaded ? "Loading…" : latest ? formatMoney(latest.amountCents) : "No paychecks yet"}</p>
        <p className="mt-2 text-xs text-slate-500">{latest ? `Received ${latest.date}` : "Add a paycheck below to get started"}</p>
      </Card>
      <section id="paychecks" className="space-y-4 lg:col-span-2" aria-labelledby="paychecks-heading">
        <div>
          <h2 id="paychecks-heading" className="text-xl font-bold">Your paychecks</h2>
          <p className="mt-1 text-sm text-slate-600">Saved only in this browser on this device. Not synced or backed up.</p>
        </div>
        {storageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{storageError}</p>}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-lg font-semibold">{editingId ? "Edit paycheck" : "Add paycheck"}</h3>
            <form id="paycheck-form" onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-medium">Date received
                <input className={`mt-1 ${field}`} type="date" max={today || undefined} value={date} onChange={(e) => setDate(e.target.value)} required disabled={!loaded || !!storageError} />
              </label>
              <label className="block text-sm font-medium">Net amount (USD)
                <input className={`mt-1 ${field}`} type="text" inputMode="decimal" placeholder="925.00" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={!loaded || !!storageError} />
              </label>
              <label className="block text-sm font-medium">Note (optional)
                <textarea className={`mt-1 ${field}`} rows={2} maxLength={200} placeholder="e.g. Weekly paycheck" value={note} onChange={(e) => setNote(e.target.value)} disabled={!loaded || !!storageError} />
              </label>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={!loaded || !!storageError} className={`${action} bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50`}>{editingId ? "Save changes" : "Add paycheck"}</button>
                {editingId && <button type="button" onClick={reset} className={`${action} border border-slate-300`}>Cancel</button>}
              </div>
            </form>
          </Card>
          <Card>
            <h3 className="mb-4 text-lg font-semibold">Paycheck history</h3>
            {!loaded ? <p className="text-slate-500">Loading paychecks…</p> : items.length === 0 ? <p className="text-slate-500">No paychecks recorded yet. Add your first paycheck using the form.</p> :
              <ul className="divide-y divide-slate-100">
                {sortPaychecks(items).map((item) => <li key={item.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold">{formatMoney(item.amountCents)}</p><p className="text-sm text-slate-500">{item.date}</p>{item.note && <p className="mt-1 break-words text-sm text-slate-600">{item.note}</p>}</div>
                    <div className="flex gap-2">
                      <button type="button" aria-label={`Edit paycheck from ${item.date}`} onClick={() => edit(item)} className={`${action} border border-slate-200 !p-2`}><Pencil size={17} /></button>
                      <button type="button" aria-label={`Delete paycheck from ${item.date}`} onClick={() => setDeletingId(item.id)} className={`${action} border border-red-200 !p-2 text-red-700`}><Trash2 size={17} /></button>
                    </div>
                  </div>
                  {deletingId === item.id && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm">
                    <p>Delete this paycheck? This cannot be undone.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => { if (persist(items.filter((entry) => entry.id !== item.id))) { setDeletingId(null); if (editingId === item.id) reset(); } }} className={`${action} bg-red-700 text-white`}>Confirm delete</button>
                      <button type="button" onClick={() => setDeletingId(null)} className={`${action} border border-slate-300`}>Cancel</button>
                    </div>
                  </div>}
                </li>)}
              </ul>}
          </Card>
        </div>
      </section>
    </>
  );
}
