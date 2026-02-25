"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Filter, RefreshCw, AlertCircle, TrendingDown } from "lucide-react";

export default function MonitorReturnPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);

    // Filter State
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        branchId: ''
    });

    // Branch State
    interface Branch { id: string, name: string }
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        // Fetch Branches on Mount
        const fetchBranches = async () => {
            try {
                const res = await fetch('/api/accurate/branches');
                if (res.ok) {
                    const data = await res.json();
                    setBranches(data);
                }
            } catch (error) {
                console.error("Failed to load branches", error);
            }
        };
        fetchBranches();
    }, []);

    const fetchReturns = async () => {
        setLoading(true);
        setInvoices([]);

        try {
            const res = await fetch('/api/monitor-return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            setInvoices(data.invoices || []);
        } catch (error: any) {
            console.error(error);
            alert(`Gagal menarik data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.push('/dashboard')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <TrendingDown className="text-red-500" />
                            Monitor Return Customer
                        </h1>
                        <p className="text-gray-500">Melihat daftar piutang dengan nilai nol atau minus karena return / lebih bayar.</p>
                    </div>
                </header>

                {/* Filters */}
                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                    <div className="flex items-center gap-2 text-gray-800 font-bold">
                        <Filter size={20} className="text-blue-600" />
                        <span>Filter Data</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Dari Tanggal</label>
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                                value={filters.fromDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Sampai Tanggal</label>
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                                value={filters.toDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Cabang (Optional)</label>
                            <select
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-medium"
                                value={filters.branchId}
                                onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
                                disabled={loading}
                            >
                                <option value="">- Semua Cabang -</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={fetchReturns}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow transition active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                            Tarik Data
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-700">Hasil Pencarian: {invoices.length} Faktur</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100/50 text-gray-600 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold border-b">No. Faktur</th>
                                    <th className="p-4 font-semibold border-b">Tanggal</th>
                                    <th className="p-4 font-semibold border-b">Pelanggan</th>
                                    <th className="p-4 font-semibold border-b text-right">Total Nilai</th>
                                    <th className="p-4 font-semibold border-b text-right text-red-600">Sisa Piutang (Minus)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            {loading ? 'Menarik data dari Accurate...' : 'Belum ada data. Silakan atur filter dan klik Tarik Data.'}
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv, idx) => (
                                        <tr key={inv.id || idx} className="hover:bg-gray-50 transition">
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{inv.transNo}</div>
                                                <div className="text-xs text-gray-500">{inv.branchName}</div>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">{inv.transDate}</td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-800">{inv.customerName}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px]">{inv.description || '-'}</div>
                                            </td>
                                            <td className="p-4 text-right font-medium text-gray-700">
                                                {formatCurrency(inv.amount)}
                                            </td>
                                            <td className="p-4 text-right font-bold text-red-600">
                                                {formatCurrency(inv.primeOwing)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
