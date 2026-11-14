import { Wallet } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center px-5 py-12">
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-center gap-3">
        <div className="rounded-xl bg-indigo-600 p-3 text-white"><Wallet size={24}/></div>
        <span className="text-2xl font-bold">MoneyFlow</span>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome to MoneyFlow</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to access your financial dashboard.</p>
      </div>
      <AuthPanel />
    </div>
  </main>;
}
