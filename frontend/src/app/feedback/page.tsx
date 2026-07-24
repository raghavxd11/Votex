'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function FeedbackPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [comments, setComments] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating < 1) return;
        setLoading(true);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        try {
            const res = await fetch(`${apiUrl}/api/feedback/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating, comments })
            });
            if (!res.ok) throw new Error('Failed to submit');
            setSubmitted(true);
        } catch (err) {
            alert('Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (submitted) {
        return (
            <main className="flex flex-col items-center justify-center flex-1 px-5 py-20 text-center animate-fade-up">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-5">
                    ✓
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Thank you!</h2>
                <p className="text-gray-400 text-sm">Your feedback helps us improve the platform.</p>
            </main>
        );
    }

    return (
        <main className="flex flex-col items-center flex-1 px-5 py-16">
            <div className="glass-card p-8 w-full max-w-sm animate-fade-up">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Share Feedback</h1>
                    <p className="text-gray-400 mt-1 text-sm">Help us improve your experience</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Stars */}
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHoveredStar(star)}
                                onMouseLeave={() => setHoveredStar(0)}
                                onClick={() => setRating(star)}
                                className={`text-2xl transition-all duration-200 hover:scale-110 ${
                                    star <= (hoveredStar || rating)
                                        ? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]'
                                        : 'text-gray-600'
                                }`}
                            >
                                ★
                            </button>
                        ))}
                    </div>

                    {/* Comments */}
                    <div>
                        <label className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-1.5 block">Comments (optional)</label>
                        <textarea
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all resize-none"
                            placeholder="Tell us what you think..."
                            rows={3}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={rating < 1 || loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-40"
                    >
                        {loading ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </form>
            </div>
        </main>
    );
}
