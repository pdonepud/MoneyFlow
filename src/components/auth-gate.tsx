"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [status, setStatus] = useState<
    "checking" | "authenticated" | "error"
  >("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    async function verifySession() {
      try {
        const supabase = getSupabaseClient();

        // Verify the current session once per dashboard mount.
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          setStatus("checking");
          router.replace("/login");
        } else {
          setStatus("authenticated");
        }
      } catch (e) {
        if (!active) return;

        setError(
          e instanceof Error
            ? e.message
            : "Unable to verify your session. Please refresh."
        );
        setStatus("error");
      }
    }

    try {
      const supabase = getSupabaseClient();

      const result = supabase.auth.onAuthStateChange((event) => {
        if (!active) return;

        if (event === "SIGNED_OUT") {
          setStatus("checking");
          router.replace("/login");
        }
      });

      subscription = result.data.subscription;

      void verifySession();
    } catch (e) {
      // Defer state updates to an asynchronous callback.
      void Promise.resolve().then(() => {
        if (!active) return;

        setError(
          e instanceof Error
            ? e.message
            : "Unable to initialize authentication."
        );
        setStatus("error");
      });
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [router]);

  if (status === "error") {
    return (
      <main className="mx-auto max-w-xl p-8" role="alert">
        {error}
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="mx-auto max-w-xl p-8 text-sm text-slate-600">
        Checking your session...
      </main>
    );
  }

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
      const { error: authError } =
        await getSupabaseClient().auth.signOut();

      if (authError) throw authError;

      router.replace("/login");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to sign out."
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => void signOut()}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
