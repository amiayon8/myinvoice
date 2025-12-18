
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export const Auth: React.FC = () => {
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center bg-slate-50 dark:bg-dark-bg p-4 min-h-screen font-sans">
            <div className="bg-white dark:bg-dark-card shadow-2xl p-8 border border-slate-200 dark:border-dark-border rounded-lg w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="flex justify-center items-center bg-indigo-600 shadow-indigo-600/20 shadow-lg mx-auto mb-4 rounded-lg w-16 h-16 font-bold text-white">
                        <i className="text-3xl fa-solid fa-bolt-lightning"></i>
                    </div>
                    <h1 className="font-black text-slate-800 dark:text-white text-2xl uppercase tracking-tight">
                        My Invoice <span className="text-indigo-600">Pro</span>
                    </h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
                        Welcome back, sign in to continue
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest">Email Address</label>
                        <input
                            type="email"
                            required
                            className="dark:bg-slate-900 p-4 border border-slate-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block mb-1 font-black text-[10px] text-slate-500 uppercase tracking-widest">Password</label>
                        <input
                            type="password"
                            required
                            className="dark:bg-slate-900 p-4 border border-slate-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full dark:text-white text-sm"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg font-bold text-red-600 dark:text-red-400 text-xs">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 shadow-xl py-4 rounded-lg w-full font-black text-white text-sm transition-all"
                    >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-right-to-bracket fa-solid"></i>}
                        SIGN IN NOW
                    </button>
                </form>
            </div>
        </div>
    );
};
