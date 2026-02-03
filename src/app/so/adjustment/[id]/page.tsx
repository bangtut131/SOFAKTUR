"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, FileWarning, CheckCircle, AlertTriangle, Download, FileSpreadsheet, FileText } from "lucide-react";
import { generatePDF } from "@/utils/pdfGenerator";

interface SoItem {
    id: string;
    transNo: string;
    transDate: string;
    customerName: string;
    amount: number;
    primeOwing: number;
    description: string;
    status: string; // UNVERIFIED, MATCHED
    existenceStatus?: string;
    remarks?: string;
}

export default function AdjustmentPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [items, setItems] = useState<SoItem[]>([]);
    const [periodName, setPeriodName] = useState("");
    const [sessionStatus, setSessionStatus] = useState("OPEN");
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'UNVERIFIED' | 'HILANG' | 'SALES'>('ALL');

    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

    // Default columns if config is missing/loading
    const ALL_COLS = ['transNo', 'transDate', 'customerName', 'amount', 'primeOwing', 'description', 'approvalStatus'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/so/sessions/${params.id}`);
                const data = await res.json();
                if (data.session) {
                    setItems(data.session.items);
                    setPeriodName(data.session.periodName);
                    setSessionStatus(data.session.status);

                    // Set allowed columns
                    if (data.visibleColumns && data.visibleColumns.length > 0) {
                        setVisibleColumns(data.visibleColumns);
                    } else {
                        // If no config found (e.g. Admin hasn't set it yet), show all
                        setVisibleColumns(ALL_COLS);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch session", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id]);

    const handleLock = async () => {
        if (!confirm("Yakin ingin MENSUBMIT sessions ini untuk Approval Finance? \nData akan dikunci dari editing.")) return;

        try {
            const res = await fetch(`/api/so/sessions/${params.id}/submit`, { method: 'POST' });
            if (res.ok) {
                alert("Berhasil Submit untuk Approval!");
                router.push('/dashboard');
            } else {
                alert("Gagal submit.");
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
    const hilangs = items.filter(i => i.existenceStatus === 'HILANG');
    const sales = items.filter(i => ['DIBAYA SALES', 'DIBAWA SALES', 'Dibawa Sales'].includes(i.existenceStatus || ''));

    // Filtering
    const filteredItems = items.filter(i => {
        if (filter === 'UNVERIFIED') return i.status !== 'MATCHED';
        if (filter === 'HILANG') return i.existenceStatus === 'HILANG';
        if (filter === 'SALES') return ['DIBAYA SALES', 'DIBAWA SALES', 'Dibawa Sales'].includes(i.existenceStatus || '');
        return true;
    });

    const isVisible = (key: string) => visibleColumns.includes(key);

    if (loading) return <div className="p-12 text-center text-gray-800">Loading Data...</div>;

    // Helper to safely parse date strings (handles DD/MM/YYYY and ISO)
    const parseDate = (dateStr: string) => {
        if (!dateStr) return null;

        // Try parsing assuming IS0 first
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;

        // Handle DD/MM/YYYY format commonly used here
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // new Date(year, monthIndex, day)
            d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(d.getTime())) return d;
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 transition shadow-sm">
                        <ArrowLeft />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Adjustment & Finalisasi</h1>
                        <p className="text-gray-600 font-medium">
                            {periodName}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${sessionStatus === 'OPEN' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                {sessionStatus}
                            </span>
                        </p>
                    </div>
                </div>

                {sessionStatus === 'OPEN' && (
                    <button
                        onClick={handleLock}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition"
                    >
                        <CheckCircle size={18} />
                        Submit for Approval
                    </button>
                )}
                {sessionStatus !== 'OPEN' && (
                    <div className="flex items-center gap-2">
                        <div className="bg-gray-100 text-gray-500 px-6 py-3 rounded-lg font-bold flex items-center gap-2 border">
                            <Lock size={18} />
                            Read Only Mode
                        </div>

                        {/* Export Buttons */}
                        {sessionStatus === 'FINALIZED' && (
                            <>
                                <button
                                    onClick={() => window.open(`/api/so/sessions/${params.id}/export`, '_blank')}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition"
                                    title="Download Excel"
                                >
                                    <FileSpreadsheet size={18} />
                                    XLSX
                                </button>
                                <button
                                    onClick={() => generatePDF({ periodName, status: sessionStatus }, items)}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition"
                                    title="Download PDF"
                                >
                                    <FileText size={18} />
                                    PDF
                                </button>
                            </>
                        )}
                    </div>
                )}
            </header>

            <main className="max-w-6xl mx-auto space-y-6">
                {/* Resume Cards */}
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
                        <button
                            onClick={() => setFilter('ALL')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Semua Data
                        </button>
                        <button
                            onClick={() => setFilter('UNVERIFIED')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'UNVERIFIED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                        >
                            Selisih Only ({unverified})
                        </button>
                        <button
                            onClick={() => setFilter('HILANG')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'HILANG' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                        >
                            Hilang ({hilangs.length})
                        </button>
                        <button
                            onClick={() => setFilter('SALES')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'SALES' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
                        >
                            Dibawa Sales ({sales.length})
                        </button>
                    </div>

                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-900 border-b">
                            <tr>
                                <th className="p-3 border-b font-bold w-12 text-center">STS</th>
                                <th className="p-3 border-b font-bold">No Faktur</th>
                                {isVisible('transDate') && <th className="p-3 border-b font-bold">Tanggal</th>}
                                {isVisible('customerName') && <th className="p-3 border-b font-bold">Customer</th>}
                                {isVisible('amount') && <th className="p-3 border-b font-bold text-right">Nilai Faktur</th>}
                                {isVisible('primeOwing') && <th className="p-3 border-b font-bold text-right">Sisa Tagihan</th>}
                                {isVisible('description') && <th className="p-3 border-b font-bold">Keterangan</th>}
                                <th className="p-3 border-b font-bold text-center">Status Fisik</th>
                                <th className="p-3 border-b font-bold">Keterangan Tambahan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredItems.map(item => {
                                const dateObj = parseDate(item.transDate);
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="p-3 text-center">
                                            {item.status === 'MATCHED' ? (
                                                <CheckCircle size={16} className="text-green-600 mx-auto" />
                                            ) : (
                                                <AlertTriangle size={16} className="text-yellow-500 mx-auto" />
                                            )}
                                        </td>
                                        {isVisible('transNo') && <td className="p-3 font-mono font-bold text-blue-900">{item.transNo}</td>}
                                        {isVisible('transDate') && <td className="p-3 text-gray-900">{dateObj ? dateObj.toLocaleDateString('id-ID') : item.transDate}</td>}
                                        {isVisible('customerName') && <td className="p-3 text-gray-900 font-bold">{item.customerName}</td>}
                                        {isVisible('amount') && <td className="p-3 text-right font-mono text-gray-900 font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.amount)}</td>}
                                        {isVisible('primeOwing') && <td className="p-3 text-right font-mono text-red-800 font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.primeOwing)}</td>}
                                        {isVisible('description') && <td className="p-3 text-gray-900 italic max-w-xs truncate" title={item.description}>{item.description}</td>}

                                        <td className="p-3 font-bold text-gray-900 text-center">
                                            {item.existenceStatus === 'ADA' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">ADA</span>}
                                            {item.existenceStatus === 'HILANG' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">HILANG</span>}
                                            {['DIBAYA SALES', 'DIBAWA SALES', 'Dibawa Sales'].includes(item.existenceStatus || '') && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">SALES</span>}
                                            {(!item.existenceStatus || item.existenceStatus === 'UNVERIFIED') && <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">-</span>}
                                        </td>
                                        <td className="p-3 text-gray-800 font-medium">{item.remarks || '-'}</td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">Tidak ada data sesuai filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
