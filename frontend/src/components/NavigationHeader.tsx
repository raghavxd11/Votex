'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';

export default function NavigationHeader() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const navLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Assistant', path: '/assistant' },
        { name: 'Appointments', path: '/appointments' },
        { name: 'Feedback', path: '/feedback' },
    ];

    return (
        <header className="w-full bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
                {/* Logo */}
                <Link
                    href={user ? '/dashboard' : '/'}
                    className="text-base font-bold tracking-tight text-white flex items-center gap-2.5"
                >
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-[10px] font-black">
                        V
                    </span>
                    Votex
                    {user && (
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                            {user.role}
                        </span>
                    )}
                </Link>

                {!user ? (
                    /* Unauthenticated */
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                            Sign In
                        </Link>
                        <Link
                            href="/signup"
                            className="text-sm font-semibold text-white bg-indigo-500/90 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition-all"
                        >
                            Get Started
                        </Link>
                    </div>
                ) : (
                    /* Authenticated */
                    <div className="flex items-center gap-1">
                        <nav className="hidden md:flex items-center gap-0.5 mr-4">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.path;
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.path}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? 'bg-white/[0.08] text-white'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        <Link
                            href="/profile"
                            className="text-xs text-gray-400 mr-3 hidden lg:flex items-center gap-1.5 hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-indigo-300">
                                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                            {user.full_name}
                        </Link>
                        <button
                            onClick={logout}
                            className="text-xs font-medium text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all duration-200"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
