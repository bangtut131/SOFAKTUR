"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Ban, CheckCircle, Plus, History, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface BlacklistEntry {
    id: string;
    customerId: string;
    reason: string | null;
    status: string;
    addedBy: string;
    createdAt: string;
    removedBy: string | null;
    removedAt: string | null;
    customer: { id: string; name: string; phone: string | null };
}

interface Customer {
    id: string;
    name: string;
    phone: string | null;
}

export default function BlacklistPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<BlacklistEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAll, setShowAll] = useState(false);

    // Modal: Add to Blacklist
    const [showAddModal, setShowAddModal] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [addReason, setAddReason] = useState('');
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState('');

    // Modal: Whitelist (remove)
    const [showWhitelistModal, setShowWhitelistModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<BlacklistEntry | null>(null);
    const [whitelisting, setWhitelisting] = useState(false);

    // Role check
    const [isStaff, setIsStaff] = useState(false);
    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };
        setIsStaff(getCookie('user_role') === 'STAFF');
    }, []);

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/piutang/blacklist?activeOnly=${!showAll}`);
            if (res.ok) {
                const data = await res.json();
                setEntries(data.entries || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEntries(); }, [showAll]);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/piutang/blacklist?customers=true');
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.customers || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleOpenAdd = async () => {
        setAddError('');
        setAddReason('');
        setSelectedCustomerId('');
        await fetchCustomers();
        setShowAddModal(true);
    };

    const handleAddBlacklist = async () => {
        if (!selectedCustomerId) { setAddError('Pilih customer terlebih dahulu'); return; }
        setAdding(true);
        setAddError('');
        try {
            const res = await fetch('/api/piutang/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: selectedCustomerId, reason: addReason || null })
            });
            const data = await res.json();
            if (!res.ok) { setAddError(data.error || 'Gagal menambahkan'); return; }
            setShowAddModal(false);
            fetchEntries();
        } catch (e: any) {
            setAddError(e.message);
        } finally {
            setAdding(false);
        }
    };

    const handleOpenWhitelist = (entry: BlacklistEntry) => {
        setSelectedEntry(entry);
        setShowWhitelistModal(true);
    };

    const handleWhitelist = async () => {
        if (!selectedEntry) return;
        setWhitelisting(true);
        try {
            const res = await fetch(`/api/piutang/blacklist/${selectedEntry.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (res.ok) {
                setShowWhitelistModal(false);
                setSelectedEntry(null);
                fetchEntries();
            }
        } catch (e) { console.error(e); } finally {
            setWhitelisting(false);
        }
    };

    const activeCount = entries.filter(e => e.status === 'ACTIVE').length;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 shadow-sm border-b shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/piutang')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Blacklist / Whitelist Broadcast</h1>
                        <p className="text-sm text-gray-500">{activeCount} customer dikecualikan dari broadcast</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center gap-2"
                    >
                        <History size={16} /> {showAll ? 'Tampilkan Aktif' : 'Tampilkan Semua'}
                    </button>
                    {!isStaff && (
                        <button
                            onClick={handleOpenAdd}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 flex items-center gap-2"
                        >
                            <Plus size={16} /> Tambah Blacklist
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 p-6">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">
                        {showAll ? 'Semua Riwayat Blacklist' : 'Customer yang Dikecualikan (Aktif)'}
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Memuat...</div>
                    ) : entries.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            {showAll ? 'Belum ada riwayat blacklist' : 'Tidak ada customer yang dikecualikan'}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                                <tr>
                                    <th className="p-3 text-left">Customer</th>
                                    <th className="p-3 text-left">Alasan</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-left">Ditambahkan Oleh</th>
                                    <th className="p-3 text-left">Tanggal Blacklist</th>
                                    {showAll && <th className="p-3 text-left">Diwhitelist Oleh</th>}
                                    {showAll && <th className="p-3 text-left">Tanggal Whitelist</th>}
                                    {!isStaff && <th className="p-3 text-center">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {entries.map(entry => (
                                    <tr key={entry.id} className={entry.status === 'INACTIVE' ? 'bg-gray-50 opacity-60' : 'hover:bg-red-50'}>
                                        <td className="p-3 font-bold text-gray-800">
                                            {entry.customer.name}
                                            {entry.customer.phone && (
                                                <div className="text-xs text-gray-400 font-normal">{entry.customer.phone}</div>
                                            )}
                                        </td>
                                        <td className="p-3 text-gray-600">{entry.reason || <span className="text-gray-300">-</span>}</td>
                                        <td className="p-3 text-center">
                                            {entry.status === 'ACTIVE' ? (
                                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    <Ban size={11} /> Exclude Broadcast
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                                                    <CheckCircle size={11} /> Whitelist
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-gray-600 text-xs">{entry.addedBy}</td>
                                        <td className="p-3 text-gray-600 text-xs">{new Date(entry.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        {showAll && <td className="p-3 text-gray-600 text-xs">{entry.removedBy || '-'}</td>}
                                        {showAll && <td className="p-3 text-gray-600 text-xs">{entry.removedAt ? new Date(entry.removedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>}
                                        {!isStaff && (
                                            <td className="p-3 text-center">
                                                {entry.status === 'ACTIVE' && (
                                                    <button
                                                        onClick={() => handleOpenWhitelist(entry)}
                                                        className="text-green-600 hover:text-green-800 font-bold text-xs flex items-center gap-1 mx-auto"
                                                    >
                                                        <CheckCircle size={13} /> Whitelist
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal: Add Blacklist */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center gap-2">
                            <Ban className="text-red-600" size={20} />
                            <h2 className="text-lg font-bold text-gray-800">Tambah ke Blacklist</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Customer *</label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                                    value={selectedCustomerId}
                                    onChange={e => setSelectedCustomerId(e.target.value)}
                                >
                                    <option value="">-- Pilih Customer --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Alasan <span className="font-normal text-gray-400">(opsional)</span></label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm"
                                    rows={3}
                                    placeholder="Contoh: Piutang dalam sengketa, Sudah lunas di luar sistem..."
                                    value={addReason}
                                    onChange={e => setAddReason(e.target.value)}
                                />
                            </div>
                            {addError && <div className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded">{addError}</div>}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                ⚠️ Customer ini tidak akan menerima broadcast WhatsApp meskipun punya piutang aktif.
                            </div>
                        </div>
                        <div className="p-4 border-t flex gap-2 justify-end">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-100 font-medium text-sm">Batal</button>
                            <button
                                onClick={handleAddBlacklist}
                                disabled={adding || !selectedCustomerId}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <Ban size={14} /> {adding ? 'Menyimpan...' : 'Blacklist Customer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Whitelist Confirmation */}
            {showWhitelistModal && selectedEntry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center gap-2">
                            <CheckCircle className="text-green-600" size={20} />
                            <h2 className="text-lg font-bold text-gray-800">Whitelist Customer</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-gray-700">
                                Anda akan mengeluarkan <strong>{selectedEntry.customer.name}</strong> dari daftar blacklist.
                                Customer ini akan kembali menerima broadcast WhatsApp jika punya piutang.
                            </p>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                                ✅ Riwayat blacklist tetap tersimpan untuk keperluan audit.
                            </div>
                        </div>
                        <div className="p-4 border-t flex gap-2 justify-end">
                            <button onClick={() => { setShowWhitelistModal(false); setSelectedEntry(null); }} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-100 font-medium text-sm">Batal</button>
                            <button
                                onClick={handleWhitelist}
                                disabled={whitelisting}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <CheckCircle size={14} /> {whitelisting ? 'Memproses...' : 'Whitelist Sekarang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
