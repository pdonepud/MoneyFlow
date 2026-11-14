"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    try {
      const supabase = getSupabaseClient();
      // Reading the local session avoids an unnecessary user lookup just to
      // decide which page to show. The dashboard still verifies with getUser().
      void supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage(error.message);
        setUser(data.session?.user ?? null);
        setReady(true);
        if (data.session?.user) window.location.replace("/");
      }).catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Unable to check session.");
        setReady(true);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active || event === "INITIAL_SESSION") return;
        setUser(session?.user ?? null);
        // Successful form submissions navigate after Supabase resolves.
        // Avoid racing the submit handler with a second redirect.
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
        const first = firstName.trim();
        const last = lastName.trim();
        if (!first || !last) throw new Error("Enter your first and last name.");
        if (first.length > 80 || last.length > 80) throw new Error("Names must be 80 characters or fewer.");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { first_name: first, last_name: last, full_name: `${first} ${last}` } }
        });
        if (error) throw error;
        if (!data.session) setMessage("Check your email for a confirmation link, then sign in.");
        else { setUser(data.user); window.location.replace("/"); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser(data.user);
        window.location.replace("/");
      }
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="account-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 id="account-heading" className="text-lg font-bold">Your MoneyFlow account</h2>
    {!ready || user ? <p className="mt-3 text-sm text-slate-600">{user ? "Opening your dashboard…" : "Checking session…"}</p> :
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={mode==="login"} onClick={()=>{setMode("login");setMessage("");}} className={`rounded-lg px-3 py-2 text-sm font-medium ${mode==="login"?"bg-indigo-600 text-white":"border border-slate-300"}`}>Sign in</button>
          <button type="button" aria-pressed={mode==="signup"} onClick={()=>{setMode("signup");setMessage("");}} className={`rounded-lg px-3 py-2 text-sm font-medium ${mode==="signup"?"bg-indigo-600 text-white":"border border-slate-300"}`}>Create account</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode==="signup" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="account-first-name" className="mb-1 block text-sm font-medium">First name</label>
              <input id="account-first-name" type="text" autoComplete="given-name" required maxLength={80} value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div>
            <div><label htmlFor="account-last-name" className="mb-1 block text-sm font-medium">Last name</label>
              <input id="account-last-name" type="text" autoComplete="family-name" required maxLength={80} value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div>
          </div>}
          <div><label htmlFor="account-email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="account-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div>
          <div><label htmlFor="account-password" className="mb-1 block text-sm font-medium">Password</label>
            <input id="account-password" type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div>
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Working…":mode==="signup"?"Create account":"Sign in"}</button>
        </form>
      </div>}
    {message && <p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
    <p className="mt-3 text-xs text-amber-800">Financial records are still stored in this browser, not yet isolated per account or synced to Supabase. Avoid shared devices until database migration is complete.</p>
  </section>;
}
