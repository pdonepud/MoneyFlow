"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking"|"authenticated"|"error">("checking");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    try {
      const supabase = getSupabaseClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (!session) {
          setStatus("checking");
          router.replace("/login");
        } else {
          setStatus("authenticated");
        }
      });
      void supabase.auth.getUser().then(({ data, error: authError }) => {
        if (!active) return;
        if (authError || !data.user) {
          setStatus("checking");
          router.replace("/login");
        } else setStatus("authenticated");
      }).catch(() => {
        if (active) { setError("Unable to verify your session. Please refresh."); setStatus("error"); }
      });
      return () => { active = false; subscription.unsubscribe(); };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to initialize authentication.");
      setStatus("error");
    }
  }, [router]);

  if (status === "error") return <main className="mx-auto max-w-xl p-8" role="alert">{error}</main>;
  if (status !== "authenticated") return <main className="mx-auto max-w-xl p-8 text-sm text-slate-600">Checking your session…</main>;
  return <>{children}</>;
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await getSupabaseClient().auth.signOut();
      if (authError) throw authError;
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign out.");
      setBusy(false);
    }
  }
  return <div className="flex items-center gap-2">
    {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    <button type="button" disabled={busy} onClick={() => void signOut()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button>
  </div>;
}
