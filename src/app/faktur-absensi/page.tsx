"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ClipboardList, Plus, ArrowLeft, Trash2, Calendar, User, Package,
    RefreshCw, CheckCircle, Clock, XCircle, ArrowRightLeft
} from "lucide-react";

interface AbsensiSession {
    id: string;
    date: string;
    salesName: string;
    notes: string | null;
    status: string;
    createdAt: string;
    totalItems: number;
    outCount: number;
    returnedCount: number;
}

export default function FakturAbsensiPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<AbsensiSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newSales, setNewSales] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/faktur-absensi');
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (e) {
            console.error('Failed to fetch sessions:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSessions(); }, []);

    const handleCreate = async () => {
        if (!newSales.trim()) {
            alert('Nama sales wajib diisi');
            return;
        }
        setCreating(true);
        try {
            const res = await fetch('/api/faktur-absensi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: newDate, salesName: newSales.trim(), notes: newNotes.trim() || null }),
            });
            if (res.ok) {
                setShowCreate(false);
                setNewSales('');
                setNewNotes('');
                fetchSessions();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal membuat sesi');
            }
        } catch (e) {
            alert('Error server');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string, salesName: string) => {
        if (!confirm(`Yakin hapus sesi absensi "${salesName}"?\nSemua data faktur akan hilang.`)) return;
        try {
            const res = await fetch(`/api/faktur-absensi/${id}`, { method: 'DELETE' });
            if (res.ok) fetchSessions();
            else alert('Gagal menghapus');
        } catch (e) {
            alert('Error server');
        }
    };

    const handleSync = async () => {
        if (!confirm('Sync data absensi ke SO?\n\nFaktur yang masih dibawa sales akan ditandai "Dibawa Sales" di data SO.\nFaktur yang sudah kembali akan direset.')) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/faktur-absensi/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
            } else {
                alert(`❌ Gagal sync: ${data.error}`);
            }
        } catch (e) {
            alert('Error server');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100 gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <ArrowLeft size={20} className="text-gray-500" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <ClipboardList className="text-orange-500" size={22} />
                                Absensi Faktur Harian
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">Tracking faktur yang dibawa sales</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-10 rounded-lg font-semibold transition shadow-md hover:shadow-lg active:scale-95 text-sm disabled:opacity-50"
                        >
                            <ArrowRightLeft size={16} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync ke SO'}
                        </button>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 h-10 rounded-lg font-semibold transition shadow-md hover:shadow-lg active:scale-95 text-sm"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Sesi Baru
                        </button>
                    </div>
                </header>

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                            <h2 className="text-lg font-bold text-gray-800">Buat Sesi Absensi Baru</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={e => setNewDate(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Nama Sales *</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Budi, Ahmad"
                                        value={newSales}
                                        onChange={e => setNewSales(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Catatan</label>
                                    <textarea
                                        placeholder="Opsional..."
                                        value={newNotes}
                                        onChange={e => setNewNotes(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="px-5 py-2 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow transition disabled:opacity-50"
                                >
                                    {creating ? 'Membuat...' : 'Buat Sesi'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Session List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardList className="text-orange-400" size={20} />
                            Daftar Sesi Absensi
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-400">
                            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                            <p>Memuat data...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <ClipboardList className="w-16 h-16 mx-auto mb-3 opacity-20" />
                            <p>Belum ada sesi absensi. Klik "Sesi Baru" untuk memulai.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    className="p-5 hover:bg-orange-50/40 transition group flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                >
                                    <div className="space-y-1.5 w-full md:w-auto cursor-pointer" onClick={() => router.push(`/faktur-absensi/${session.id}`)}>
                                        <h3 className="text-base font-bold text-gray-800 group-hover:text-orange-600 transition flex items-center gap-2">
                                            <User size={16} className="text-gray-400" />
                                            {session.salesName}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {new Date(session.date).toLocaleDateString('id-ID', {
                                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Package size={14} />
                                                {session.totalItems} faktur
                                            </span>
                                        </div>
                                        {/* Status pills */}
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {session.outCount > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                    <Clock size={12} /> {session.outCount} dibawa
                                                </span>
                                            )}
                                            {session.returnedCount > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                    <CheckCircle size={12} /> {session.returnedCount} kembali
                                                </span>
                                            )}
                                            {session.totalItems > 0 && session.outCount === 0 && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                    <CheckCircle size={12} /> Semua kembali
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${session.status === 'OPEN'
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                            {session.status}
                                        </span>
                                        <Link
                                            href={`/faktur-absensi/${session.id}`}
                                            className="bg-white border border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm"
                                        >
                                            Buka
                                        </Link>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(session.id, session.salesName); }}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Hapus"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
