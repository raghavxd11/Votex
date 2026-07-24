import Link from 'next/link';

export default function LandingPage() {
    return (
        <main className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center min-h-[85vh]">
            {/* Hero */}
            <div className="animate-fade-up max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-xs font-medium tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AI-Powered Diagnostics Platform
                </div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-tight">
                    <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        Understand Your
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Mental Wellness
                    </span>
                </h1>

                <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed font-light">
                    Multimodal analysis fusing voice biomarkers and clinical text
                    to provide transparent, explainable mental health insights.
                </p>
            </div>

            {/* CTA */}
            <div className="animate-fade-up-delay flex flex-col sm:flex-row gap-4 mt-10">
                <Link
                    href="/dashboard"
                    className="group relative px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold rounded-xl text-sm hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-300 hover:-translate-y-0.5"
                >
                    Launch Dashboard
                    <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
                <Link
                    href="/signup"
                    className="px-8 py-3.5 bg-white/5 text-gray-300 font-semibold rounded-xl text-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5"
                >
                    Create Free Account
                </Link>
            </div>

            {/* Feature Cards */}
            <div className="animate-fade-up-delay-2 mt-24 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full text-left">
                {[
                    {
                        icon: '🎙️',
                        title: 'Acoustic Analysis',
                        desc: 'Extract micro-tension patterns from vocal biomarkers using standard audio recordings.',
                        accent: 'from-blue-500/10 to-transparent border-blue-500/10',
                    },
                    {
                        icon: '🧠',
                        title: 'Semantic Fusion',
                        desc: 'Cross-attention deep learning evaluates clinical text and documents in real time.',
                        accent: 'from-emerald-500/10 to-transparent border-emerald-500/10',
                    },
                    {
                        icon: '⚡',
                        title: 'Explainable AI',
                        desc: 'Transparent SHAP values and sentiment scores validate every diagnosis natively.',
                        accent: 'from-indigo-500/10 to-transparent border-indigo-500/10',
                    },
                ].map((f) => (
                    <div
                        key={f.title}
                        className={`group p-6 rounded-2xl bg-gradient-to-br ${f.accent} border backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20`}
                    >
                        <div className="text-2xl mb-3">{f.icon}</div>
                        <h3 className="font-semibold text-white text-base mb-1.5">{f.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </main>
    );
}
