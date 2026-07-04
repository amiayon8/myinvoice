'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex justify-center items-center bg-slate-50 dark:bg-[#020617] p-4 min-h-screen font-sans overflow-hidden">
      {/* Decorative blurred blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-md bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl p-8 lg:p-10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] animate-slide-in">
        <div className="mb-8 text-center">
          <div className="flex justify-center items-center bg-indigo-600 hover:scale-110 transition-transform shadow-indigo-600/30 shadow-2xl mx-auto mb-5 rounded-2xl w-14 h-14 font-bold text-white">
            <i className="text-2xl fa-solid fa-bolt-lightning"></i>
          </div>
          <h1 className="font-black text-slate-900 dark:text-white text-2xl uppercase tracking-tight font-display">
            Invoices
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            The Nice Developer
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-1">
            <label className="block mb-1 font-black text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Email Address
            </label>
            <input
              type="email"
              required
              className="bg-white/80 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800/60 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 w-full dark:text-white text-sm transition-all shadow-inner"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block mb-1 font-black text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Password
            </label>
            <input
              type="password"
              required
              className="bg-white/80 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-800/60 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 w-full dark:text-white text-sm transition-all shadow-inner"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 font-bold text-rose-600 dark:text-rose-400 text-xs animate-slide-in">
              <i className="fa-solid fa-circle-exclamation text-sm"></i>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 hover:shadow-indigo-600/30 shadow-xl py-4 rounded-xl w-full font-black text-white text-xs uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-75 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                <span>Authorizing Portal...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>Request Entry</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
