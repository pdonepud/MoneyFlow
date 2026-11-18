"use client";
import { useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export function ResetPasswordForm(){
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [complete,setComplete]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    if(password.length<8){setMessage("Use at least 8 characters.");return;}
    if(password!==confirm){setMessage("Passwords do not match.");return;}
    setBusy(true);
    try{
      const supabase=getSupabaseClient();
      const {data,error}=await supabase.auth.getUser();
      if(error||!data.user)throw new Error("Your recovery link is invalid or expired. Request another reset email.");
      const result=await supabase.auth.updateUser({password});
      if(result.error)throw result.error;
      await supabase.auth.signOut();
      setComplete(true);setPassword("");setConfirm("");
      setMessage("Password updated. Sign in with your new password.");
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to reset password.");}
    finally{setBusy(false);}
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-bold">Reset your password</h1>
    {complete?<a className="mt-4 inline-block text-indigo-700 underline" href="/login">Return to sign in</a>:
      <form onSubmit={e=>void submit(e)} className="mt-5 space-y-4">
        <div><label htmlFor="new-password" className="mb-1 block text-sm font-medium">New password</label><input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2"/></div>
        <div><label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2"/></div>
        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?"Updating…":"Update password"}</button>
      </form>}
    {message&&<p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
  </section>;
}
