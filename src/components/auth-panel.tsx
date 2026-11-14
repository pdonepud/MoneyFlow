"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    try {
      const supabase = getSupabaseClient();
      void supabase.auth.getUser().then(({ data, error }) => {
        if (!active) return;
        if (error && error.name !== "AuthSessionMissingError") setMessage(error.message);
        setUser(data.user);
        setReady(true);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setUser(session?.user ?? null);
      });
      return () => { active = false; subscription.unsubscribe(); };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Supabase configuration error.");
      setReady(true);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setMessage("Check your email for a confirmation link, then sign in.");
        else setMessage("Account created and signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("Signed in.");
      }
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
      setUser(null);
      setMessage("Signed out. Browser-stored financial data remains on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign out failed.");
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="account-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 id="account-heading" className="text-lg font-bold">Your MoneyFlow account</h2>
    {!ready ? <p className="mt-2 text-sm text-slate-600">Checking session…</p> : user ?
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">Signed in as <strong>{user.email}</strong></p>
        <button type="button" disabled={busy} onClick={() => void signOut()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">Sign out</button>
      </div> :
      <div className="mt-3 space-y-3">
        <div className="flex gap-2">
          <button type="button" aria-pressed={mode==="login"} onClick={()=>{setMode("login");setMessage("");}} className={`rounded-lg px-3 py-2 text-sm ${mode==="login"?"bg-indigo-600 text-white":"border border-slate-300"}`}>Sign in</button>
          <button type="button" aria-pressed={mode==="signup"} onClick={()=>{setMode("signup");setMessage("");}} className={`rounded-lg px-3 py-2 text-sm ${mode==="signup"?"bg-indigo-600 text-white":"border border-slate-300"}`}>Create account</button>
        </div>
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="account-email">Email</label>
          <input id="account-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"/>
          <label className="sr-only" htmlFor="account-password">Password</label>
          <input id="account-password" type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"/>
          <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Working…":mode==="signup"?"Sign up":"Sign in"}</button>
        </form>
      </div>}
    {message && <p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
    <p className="mt-3 text-xs text-amber-800">Authentication preview: financial records still live in this browser and are not yet isolated per account or synced to Supabase. Do not use shared devices for sensitive financial entries.</p>
  </section>;
}
