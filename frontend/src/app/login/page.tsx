'use client';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const res = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Login failed');
            }

            const data = await res.json();
            const profileRes = await fetch(`${apiUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` },
            });
            const userData = await profileRes.json();
            login(data.access_token, userData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex flex-col items-center justify-center flex-1 px-5 py-16">
            <div className="glass-card p-8 w-full max-w-sm animate-fade-up">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                    <p className="text-gray-400 mt-1 text-sm">Sign in to your Votex account</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-5 text-xs text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-1.5 block">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-1.5 block">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-4">
                        No account? <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold">Create one</Link>
                    </p>
                </form>
            </div>
        </main>
    );
}
