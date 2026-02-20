"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Plus, Trash2, RotateCcw, CheckCircle, Clock,
    Package, User, Calendar, Search, X, ClipboardList, Lock, Camera
} from "lucide-react";
import CameraScanner from "@/components/CameraScanner";

interface AbsensiItem {
    id: string;
    transNo: string;
    customerName: string;
    amount: number;
    handedAt: string;
    returnedAt: string | null;
    returnStatus: string;
    remarks: string | null;
}

interface AbsensiSession {
    id: string;
    date: string;
    salesName: string;
    notes: string | null;
    status: string;
    items: AbsensiItem[];
}

interface SuggestionItem {
    transNo: string;
    customerName: string;
    amount: number;
}

export default function AbsensiDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [session, setSession] = useState<AbsensiSession | null>(null);
    const [loading, setLoading] = useState(true);

    // Add item form
    const [transNo, setTransNo] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [adding, setAdding] = useState(false);

    // Autocomplete
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Scanner
    const [showScanner, setShowScanner] = useState(false);

    // Filter
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'OUT' | 'RETURNED'>('ALL');

    const fetchSession = useCallback(async () => {
        try {
            const res = await fetch(`/api/faktur-absensi/${id}`);
            const data = await res.json();
            setSession(data.session);
        } catch (e) {
            console.error('Failed to fetch session:', e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchSession(); }, [fetchSession]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const searchTransNo = async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await fetch(`/api/faktur-absensi/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setSuggestions(data.items || []);
            setShowSuggestions(true);
        } catch (e) {
            console.error('Search failed:', e);
        }
    };

    const handleTransNoChange = (value: string) => {
        setTransNo(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => searchTransNo(value), 300);
        setSearchTimeout(timeout);
    };

    const selectSuggestion = (item: SuggestionItem) => {
        setTransNo(item.transNo);
        setCustomerName(item.customerName);
        setAmount(item.amount.toString());
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleScanResult = async (scannedText: string) => {
        setShowScanner(false);
        const cleaned = scannedText.trim();
        setTransNo(cleaned);

        // Try to auto-fill from SoItem data
        try {
            const res = await fetch(`/api/faktur-absensi/search?q=${encodeURIComponent(cleaned)}`);
            const data = await res.json();
            const match = (data.items || []).find(
                (i: SuggestionItem) => i.transNo.toLowerCase() === cleaned.toLowerCase()
            );
            if (match) {
                setCustomerName(match.customerName);
                setAmount(match.amount.toString());
            }
        } catch (e) {
            // Ignore search errors, user can still fill manually
        }
    };

    const handleAddItem = async () => {
        if (!transNo.trim()) {
            alert('Nomor faktur wajib diisi');
            return;
        }
        setAdding(true);
        try {
            const res = await fetch(`/api/faktur-absensi/${id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transNo: transNo.trim(),
                    customerName: customerName.trim() || '-',
                    amount: parseFloat(amount) || 0,
                    remarks: remarks.trim() || null,
                }),
            });
            if (res.ok) {
                setTransNo('');
                setCustomerName('');
                setAmount('');
                setRemarks('');
                fetchSession();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menambahkan faktur');
            }
        } catch (e) {
            alert('Error server');
        } finally {
            setAdding(false);
        }
    };

    const handleReturn = async (itemId: string) => {
        try {
            const res = await fetch(`/api/faktur-absensi/${id}/items/${itemId}/return`, {
                method: 'PATCH',
            });
            if (res.ok) {
                fetchSession();
            } else {
                alert('Gagal mengubah status');
            }
        } catch (e) {
            alert('Error server');
        }
    };

    const handleDeleteItem = async (itemId: string, transNo: string) => {
        if (!confirm(`Hapus faktur ${transNo} dari sesi ini?`)) return;
        try {
            const res = await fetch(`/api/faktur-absensi/${id}/items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId }),
            });
            if (res.ok) {
                fetchSession();
            } else {
                alert('Gagal menghapus');
            }
        } catch (e) {
            alert('Error server');
        }
    };

    const handleCloseSession = async () => {
        if (!confirm('Tutup sesi absensi ini? Status akan berubah menjadi CLOSED.')) return;
        try {
            const res = await fetch(`/api/faktur-absensi/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'CLOSED' }),
            });
            if (res.ok) fetchSession();
            else alert('Gagal menutup sesi');
        } catch (e) {
            alert('Error server');
        }
    };

    const handleReopenSession = async () => {
        try {
            const res = await fetch(`/api/faktur-absensi/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'OPEN' }),
            });
            if (res.ok) fetchSession();
        } catch (e) {
            alert('Error server');
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-400 animate-pulse">Memuat...</div>
            </main>
        );
    }

    if (!session) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <p className="text-gray-500 font-bold">Sesi tidak ditemukan</p>
                    <Link href="/faktur-absensi" className="text-orange-600 underline text-sm">Kembali</Link>
                </div>
            </main>
        );
    }

    const items = session.items || [];
    const filteredItems = filterStatus === 'ALL' ? items : items.filter(i => i.returnStatus === filterStatus);
    const outCount = items.filter(i => i.returnStatus === 'OUT').length;
    const returnedCount = items.filter(i => i.returnStatus === 'RETURNED').length;
    const isOpen = session.status === 'OPEN';

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

    return (
        <main className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans">
            <div className="max-w-6xl mx-auto space-y-5">
                {/* Header */}
                <header className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/faktur-absensi" className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <ArrowLeft size={20} className="text-gray-500" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <User size={18} className="text-orange-500" />
                                    {session.salesName}
                                </h1>
                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {new Date(session.date).toLocaleDateString('id-ID', {
                                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${isOpen ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                        {session.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {isOpen ? (
                                <button
                                    onClick={handleCloseSession}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition"
                                >
                                    <Lock size={14} /> Tutup Sesi
                                </button>
                            ) : (
                                <button
                                    onClick={handleReopenSession}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-semibold transition"
                                >
                                    <RotateCcw size={14} /> Buka Kembali
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                            <div className="text-2xl font-bold text-gray-800">{items.length}</div>
                            <div className="text-xs text-gray-500 font-semibold">Total Faktur</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                            <div className="text-2xl font-bold text-amber-600">{outCount}</div>
                            <div className="text-xs text-amber-600 font-semibold">Masih Dibawa</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                            <div className="text-2xl font-bold text-green-600">{returnedCount}</div>
                            <div className="text-xs text-green-600 font-semibold">Sudah Kembali</div>
                        </div>
                    </div>
                </header>

                {/* Add Faktur Form */}
                {isOpen && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Plus size={16} className="text-orange-500" />
                                Tambah Faktur
                            </h2>
                            <button
                                onClick={() => setShowScanner(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm active:scale-95"
                            >
                                <Camera size={16} />
                                Scan Barcode
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            {/* TransNo with Autocomplete */}
                            <div className="md:col-span-3 relative" ref={suggestionsRef}>
                                <input
                                    type="text"
                                    placeholder="No. Faktur *"
                                    value={transNo}
                                    onChange={e => handleTransNoChange(e.target.value)}
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                                {transNo && (
                                    <button
                                        onClick={() => { setTransNo(''); setSuggestions([]); setShowSuggestions(false); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => selectSuggestion(s)}
                                                className="w-full text-left px-3 py-2.5 hover:bg-orange-50 text-sm border-b border-gray-50 last:border-0 transition"
                                            >
                                                <div className="font-bold text-gray-800">{s.transNo}</div>
                                                <div className="text-xs text-gray-500">{s.customerName} • {formatCurrency(s.amount)}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Nama Customer"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="md:col-span-3 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            />
                            <input
                                type="number"
                                placeholder="Nominal (Rp)"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="md:col-span-2 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            />
                            <input
                                type="text"
                                placeholder="Keterangan"
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                className="md:col-span-2 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            />
                            <button
                                onClick={handleAddItem}
                                disabled={adding}
                                className="md:col-span-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-sm disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {adding ? 'Menambah...' : 'Tambah'}
                            </button>
                        </div>

                        {/* Camera Scanner Modal */}
                        {showScanner && (
                            <CameraScanner
                                onScan={handleScanResult}
                                onClose={() => setShowScanner(false)}
                            />
                        )}
                    </div>
                )}

                {/* Items Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Package size={16} className="text-orange-400" />
                            Daftar Faktur Diserahkan
                        </h2>
                        <div className="flex gap-2">
                            {(['ALL', 'OUT', 'RETURNED'] as const).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === status
                                        ? 'bg-orange-500 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {status === 'ALL' ? `Semua (${items.length})` :
                                        status === 'OUT' ? `Dibawa (${outCount})` :
                                            `Kembali (${returnedCount})`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredItems.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Belum ada faktur</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">No. Faktur</th>
                                        <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs">Customer</th>
                                        <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs">Nominal</th>
                                        <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">Diserahkan</th>
                                        <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">Dikembalikan</th>
                                        <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">Status</th>
                                        <th className="text-center px-4 py-3 font-bold text-gray-600 text-xs">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredItems.map(item => (
                                        <tr key={item.id} className={`hover:bg-gray-50/50 transition ${item.returnStatus === 'OUT' ? 'bg-amber-50/30' : ''
                                            }`}>
                                            <td className="px-4 py-3 font-mono font-bold text-gray-800">{item.transNo}</td>
                                            <td className="px-4 py-3 text-gray-600">{item.customerName}</td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-700">{formatCurrency(item.amount)}</td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-500">
                                                {new Date(item.handedAt).toLocaleString('id-ID', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-500">
                                                {item.returnedAt ? new Date(item.returnedAt).toLocaleString('id-ID', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                }) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${item.returnStatus === 'OUT'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {item.returnStatus === 'OUT' ? (
                                                        <><Clock size={12} /> Dibawa</>
                                                    ) : (
                                                        <><CheckCircle size={12} /> Kembali</>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleReturn(item.id)}
                                                        className={`p-1.5 rounded-lg transition text-xs font-bold ${item.returnStatus === 'OUT'
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                            }`}
                                                        title={item.returnStatus === 'OUT' ? 'Terima Kembali' : 'Batalkan Pengembalian'}
                                                    >
                                                        {item.returnStatus === 'OUT' ? (
                                                            <CheckCircle size={16} />
                                                        ) : (
                                                            <RotateCcw size={16} />
                                                        )}
                                                    </button>
                                                    {isOpen && (
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id, item.transNo)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
