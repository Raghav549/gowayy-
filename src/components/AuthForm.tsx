"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { px } from "@/lib/images";

export function AuthForm() {
  const sp = useSearchParams();
  const rawNext = sp.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.FormEvent, override?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setErr("");
    const payload = override ?? f;
    const r = await fetch(`/api/auth/${override ? "login" : mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({ ok: false, error: "Something went wrong" }));
    if (!j.ok) {
      setErr(j.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    window.location.href = j.role === "admin" && next === "/" ? "/admin" : next;
  }

  const field = "flex items-center gap-3 rounded-2xl bg-white/85 px-4 ring-1 ring-brand-100 focus-within:ring-2 focus-within:ring-brand-400 transition";
  const inp = "h-12 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-ink/35";

  return (
    <div className="grid grid-cols-1 min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={px(41192863, 1400)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14082e]/90 via-[#3b1773]/40 to-[#7c3aed]/30" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <h2 className="font-display max-w-md text-5xl font-semibold leading-[1.02]">The whole hills, in one app.</h2>
          <p className="mt-3 max-w-md text-white/75">Tours, stays, cabs, groceries, food and local shops — all connected.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="anim-up w-full max-w-md">
          <Link href="/" className="mb-8 inline-block"><Logo size={40} /></Link>
          <h1 className="font-display text-4xl font-semibold leading-tight">{mode === "login" ? "Welcome back." : "Create your account."}</h1>
          <p className="mt-1.5 text-sm text-ink/60">{mode === "login" ? "Sign in to book, order and track everything." : "Get ₹500 welcome credits on signup."}</p>

          <div className="glass relative mt-6 grid grid-cols-2 rounded-full p-1.5">
            <span className="absolute bottom-1.5 top-1.5 w-[calc(50%-6px)] rounded-full bg-ink transition-all duration-500" style={{ left: mode === "login" ? 6 : "calc(50%)" }} />
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} className={`relative z-10 h-11 rounded-full text-sm font-bold transition ${mode === m ? "text-white" : "text-ink/60"}`}>
                {m === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => submit(e)} className="mt-5 space-y-3">
            {mode === "signup" && (
              <>
                <label className={`${field} anim-up`}><User size={17} className="text-ink/40" /><input className={inp} placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
                <label className={`${field} anim-up`}><Phone size={17} className="text-ink/40" /><input className={inp} placeholder="Phone (optional)" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
              </>
            )}
            <label className={field}><Mail size={17} className="text-ink/40" /><input className={inp} type="email" placeholder="Email address" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
            <label className={field}><Lock size={17} className="text-ink/40" /><input className={inp} type="password" placeholder="Password (min 6 characters)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></label>
            {err && <p className="anim-pop rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">{err}</p>}
            <button disabled={busy} className="btn btn-dark h-14 w-full text-base">
              {busy ? <Loader2 className="animate-spin" size={18} /> : <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-6 rounded-3xl border border-dashed border-brand-300 bg-white/50 p-4">
            <p className="text-xs font-bold text-brand-700">Try it instantly</p>
            <div className="mt-2 flex gap-2">
              <button disabled={busy} onClick={() => submit(undefined, { email: "demo@gowayy.in", password: "demo1234" })} className="btn btn-light btn-sm flex-1">Demo traveller</button>
              <button disabled={busy} onClick={() => submit(undefined, { email: "admin@gowayy.in", password: "admin123" })} className="btn btn-light btn-sm flex-1">Admin dashboard</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
