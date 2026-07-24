'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('patient');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        try {
            const res = await fetch(`${apiUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name: fullName, role })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Signup failed');
            }
            router.push('/login');
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
                    <h1 className="text-2xl font-bold text-white">Create account</h1>
                    <p className="text-gray-400 mt-1 text-sm">Join Votex Intelligence today</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-5 text-xs text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-1.5 block">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all"
                            placeholder="Jane Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

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

                    <div>
                        <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-1.5 block">Account Type</label>
                        <select
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="patient">Patient</option>
                            <option value="doctor">Medical Professional</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-4">
                        Already have an account? <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">Sign In</Link>
                    </p>
                </form>
            </div>
        </main>
    );
}
