"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, FileCheck, Download } from "lucide-react";

interface SoItem {
    id: string;
    transNo: string;
    customerName: string;
    amount: number;
    primeOwing: number;
    status: string;
    existenceStatus?: string;
    remarks?: string;
}

export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const router = useRouter();
    const [items, setItems] = useState<SoItem[]>([]);
    const [periodName, setPeriodName] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'UNVERIFIED' | 'HILANG' | 'SALES'>('ALL');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/so/sessions/${id}`);
                const data = await res.json();
                if (data.session) {
                    setItems(data.session.items);
                    setPeriodName(data.session.periodName);
                    setStatus(data.session.status);
                }
            } catch (error) {
                console.error("Failed to fetch session", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleApproval = async (action: 'APPROVE' | 'REJECT') => {
        const confirmMsg = action === 'APPROVE'
            ? "Yakin ingin MENYETUJUI (Finalize) sesi ini?"
            : "Yakin ingin MENOLAK dan membuka kembali sesi untuk Staff?";

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/so/sessions/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            if (res.ok) {
                alert(action === 'APPROVE' ? "Sesi Finalized!" : "Sesi Dikembalikan ke Staff!");
                router.push('/dashboard');
            }
        } catch (error) {
            console.error(error);
            alert("Error server");
        }
    };

    // Stats
    const totalItems = items.length;
    const verified = items.filter(i => i.status === 'MATCHED').length;
    const unverified = items.length - verified;
    const hilangs = items.filter(i => i.existenceStatus === 'Hilang');
    const sales = items.filter(i => i.existenceStatus === 'Dibawa Sales');

    const filteredItems = items.filter(i => {
        if (filter === 'UNVERIFIED') return i.status !== 'MATCHED';
        if (filter === 'HILANG') return i.existenceStatus === 'Hilang';
        if (filter === 'SALES') return i.existenceStatus === 'Dibawa Sales';
        return true;
    });

    if (loading) return <div className="p-12 text-center">Loading Data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Finance Approval</h1>
                        <p className="text-gray-600 font-medium">{periodName} <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">{status}</span></p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.open(`/api/so/sessions/${id}/export`, '_blank')}
                        className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-bold transition"
                        title="Download Rekap Excel"
                    >
                        <Download size={18} />
                        Excel
                    </button>
                    <button
                        onClick={() => handleApproval('REJECT')}
                        className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-bold transition"
                    >
                        <XCircle size={18} />
                        Reject / Re-open
                    </button>
                    <button
                        onClick={() => handleApproval('APPROVE')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition"
                    >
                        <FileCheck size={18} />
                        Approve & Finalize
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto space-y-6">
                {/* Resume Cards - Same as Adjustment but Read Only Context */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-sm text-gray-600 font-bold uppercase">Total Faktur</div>
                        <div className="text-3xl font-mono font-bold text-blue-700">{totalItems}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-sm text-gray-600 font-bold uppercase">Verified (Match)</div>
                        <div className="text-3xl font-mono font-bold text-green-700">{verified}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm border-red-200 bg-red-50">
                        <div className="text-sm text-red-700 font-bold uppercase">Selisih / Belum OK</div>
                        <div className="text-3xl font-mono font-bold text-red-700">{unverified}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-sm text-gray-600 font-bold uppercase">Hilang & Sales</div>
                        <div className="text-sm font-medium pt-1 text-gray-800">
                            Hilang: <span className="font-bold text-red-700">{hilangs.length}</span> <br />
                            Sales: <span className="font-bold text-orange-700">{sales.length}</span>
                        </div>
                    </div>
                </div>

                {/* List Container */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b flex gap-2 overflow-x-auto">
                        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Semua Data</button>
                        <button onClick={() => setFilter('UNVERIFIED')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'UNVERIFIED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Selisih Only ({unverified})</button>
                        <button onClick={() => setFilter('HILANG')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'HILANG' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>Hilang ({hilangs.length})</button>
                        <button onClick={() => setFilter('SALES')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'SALES' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>Sales ({sales.length})</button>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-900 border-b">
                            <tr>
                                <th className="p-3 border-b font-bold">Status</th>
                                <th className="p-3 border-b font-bold">No Faktur</th>
                                <th className="p-3 border-b font-bold">Customer</th>
                                <th className="p-3 border-b font-bold text-right">Nilai Faktur</th>
                                <th className="p-3 border-b font-bold text-right">Sisa Tagihan</th>
                                <th className="p-3 border-b font-bold">Status Keberadaan</th>
                                <th className="p-3 border-b font-bold">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-3">
                                        {item.status === 'MATCHED' ? (
                                            <span className="inline-flex items-center gap-1 text-green-800 font-extrabold text-xs bg-green-200 px-2 py-1 rounded border border-green-300">
                                                <CheckCircle size={12} /> OK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-gray-600 font-extrabold text-xs bg-gray-200 px-2 py-1 rounded border border-gray-300">
                                                <AlertTriangle size={12} /> PENDING
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 font-mono font-bold text-blue-700">{item.transNo}</td>
                                    <td className="p-3 text-gray-900 font-medium">{item.customerName}</td>
                                    <td className="p-3 text-right font-mono text-gray-800 font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.amount)}</td>
                                    <td className="p-3 text-right font-mono text-red-700 font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.primeOwing)}</td>
                                    <td className="p-3 font-bold text-gray-900">{item.existenceStatus || '-'}</td>
                                    <td className="p-3 text-gray-800 font-medium">{item.remarks || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
