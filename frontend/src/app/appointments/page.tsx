'use client';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AppointmentsPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [doctors, setDoctors] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [bookDate, setBookDate] = useState('');
    const [notes, setNotes] = useState('');
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (token) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            fetch(`${apiUrl}/api/appointments/doctors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()).then(setDoctors).catch(() => {});

            fetch(`${apiUrl}/api/appointments/mine`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()).then(setAppointments).catch(() => {});
        }
    }, [token]);

    const handleBook = async () => {
        if (!selectedDoc || !bookDate) return;
        setBooking(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        try {
            const res = await fetch(`${apiUrl}/api/appointments/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ doctor_id: selectedDoc, date: new Date(bookDate).toISOString(), notes })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Booking failed');
            }
            const newAppt = await res.json();
            setAppointments(prev => [newAppt, ...prev]);
            setSelectedDoc(null);
            setBookDate('');
            setNotes('');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setBooking(false);
        }
    };

    if (authLoading || !user) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto px-5 py-10 w-full">
            <div className="text-center mb-10 animate-fade-up">
                <h1 className="text-3xl font-bold">
                    <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Appointments
                    </span>
                </h1>
                <p className="text-gray-400 mt-2 text-sm">Book consultations with specialist practitioners</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 animate-fade-up-delay">
                {/* Doctors */}
                <div className="glass-card p-5">
                    <h2 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-4">Available Specialists</h2>
                    {doctors.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No specialists registered yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {doctors.map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => setSelectedDoc(d.id)}
                                    className={`w-full text-left p-3 rounded-xl text-sm transition-all duration-200 ${
                                        selectedDoc === d.id
                                            ? 'bg-indigo-500/10 border border-indigo-500/20 text-white'
                                            : 'bg-white/[0.02] border border-white/[0.05] text-gray-300 hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <span className="font-semibold">{d.full_name}</span>
                                    <span className="text-gray-500 text-xs ml-2">{d.specialty}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Book */}
                <div className="glass-card p-5">
                    <h2 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-4">Book Session</h2>
                    <div className="space-y-3">
                        <input
                            type="datetime-local"
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-gray-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all"
                            value={bookDate}
                            onChange={(e) => setBookDate(e.target.value)}
                        />
                        <textarea
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all resize-none"
                            placeholder="Additional notes (optional)"
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                        <button
                            onClick={handleBook}
                            disabled={!selectedDoc || !bookDate || booking}
                            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-400 hover:to-emerald-400 text-white text-sm font-semibold py-3 rounded-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-40"
                        >
                            {booking ? 'Booking...' : 'Confirm Booking'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Existing Appointments */}
            {appointments.length > 0 && (
                <div className="mt-8 glass-card p-5 animate-fade-up-delay-2">
                    <h2 className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-4">Your Appointments</h2>
                    <div className="space-y-2">
                        {appointments.map((a) => (
                            <div key={a.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-sm">
                                <div>
                                    <span className="font-semibold text-gray-200">{a.doctor_name || 'Doctor'}</span>
                                    <span className="text-gray-500 ml-2 text-xs">{new Date(a.date).toLocaleDateString()}</span>
                                </div>
                                <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                                    a.status === 'scheduled'
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-gray-400 bg-white/[0.05]'
                                }`}>{a.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
