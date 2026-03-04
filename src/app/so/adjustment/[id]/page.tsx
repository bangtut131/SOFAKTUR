"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, Lock, CheckCircle, AlertTriangle, Download,
    FileSpreadsheet, FileText, Plus, Trash2, ClipboardList
} from "lucide-react";
import { generatePDF, generateBAFOPdf, SelisihRow, BAFOSignatories } from "@/utils/pdfGenerator";

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

const BULAN_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const formatTglIndo = (date: Date) =>
    `${date.getDate()} ${BULAN_ID[date.getMonth()]} ${date.getFullYear()}`;

export default function AdjustmentPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const [items, setItems] = useState<SoItem[]>([]);
    const [periodName, setPeriodName] = useState("");
    const [sessionStatus, setSessionStatus] = useState("OPEN");
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'UNVERIFIED' | 'HILANG' | 'SALES'>('ALL');
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

    // BAFO state
    const today = new Date();
    const [bafoOpen, setBafoOpen] = useState(false);
    const [cutOffDate, setCutOffDate] = useState(formatTglIndo(today));
    const [docCity, setDocCity] = useState("Semarang");
    const [docDate, setDocDate] = useState(formatTglIndo(today));
    const [selisihRows, setSelisihRows] = useState<SelisihRow[]>([]);
    const [signatories, setSignatories] = useState<BAFOSignatories>({
        pemegangInvoice: { nama: '', tanggal: '' },
        petugasOpname: { nama: '', tanggal: '' },
        faSPV: { nama: '', tanggal: '' },
        fam: { nama: '', tanggal: '' },
    });
    const [bafoExporting, setBafoExporting] = useState(false);

    const ALL_COLS = ['transNo', 'transDate', 'customerName', 'amount', 'primeOwing', 'description', 'approvalStatus'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/so/sessions/${id}`);
                const data = await res.json();
                if (data.session) {
                    const sessionItems: SoItem[] = data.session.items;
                    setItems(sessionItems);
                    setPeriodName(data.session.periodName);
                    setSessionStatus(data.session.status);

                    if (data.visibleColumns && data.visibleColumns.length > 0) {
                        setVisibleColumns(data.visibleColumns);
                    } else {
                        setVisibleColumns(ALL_COLS);
                    }

                    // Pre-fill selisih rows with "Hilang" items
                    const hilangRows = sessionItems
                        .filter(i => i.existenceStatus === 'Hilang')
                        .map(i => ({
                            customerName: i.customerName,
                            transNo: i.transNo,
                            piutang: i.primeOwing,
                            keterangan: 'Hilang',
                        }));
                    if (hilangRows.length > 0) setSelisihRows(hilangRows);
                }
            } catch (error) {
                console.error("Failed to fetch session", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleLock = async () => {
        if (!confirm("Yakin ingin MENSUBMIT sessions ini untuk Approval Finance? \nData akan dikunci dari editing.")) return;
        try {
            const res = await fetch(`/api/so/sessions/${id}/submit`, { method: 'POST' });
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
    const hilangs = items.filter(i => i.existenceStatus === 'Hilang' || i.existenceStatus === 'HILANG');
    const sales = items.filter(i => ['DIBAYA SALES', 'DIBAWA SALES', 'Dibawa Sales'].includes(i.existenceStatus || ''));

    // BAFO computed values
    const nonExcluded = items.filter(i => i.existenceStatus !== 'Exclude');
    const adaItems = nonExcluded.filter(i => i.existenceStatus === 'Ada');
    const salesItems = nonExcluded.filter(i => i.existenceStatus === 'Dibawa Sales');
    const hilangItems = nonExcluded.filter(i => i.existenceStatus === 'Hilang');
    const sumAda = adaItems.reduce((s, i) => s + i.primeOwing, 0);
    const sumSales = salesItems.reduce((s, i) => s + i.primeOwing, 0);
    const sumHilang = hilangItems.reduce((s, i) => s + i.primeOwing, 0);
    const subtotalRp = sumAda + sumSales;
    const subtotalLbr = adaItems.length + salesItems.length;
    const belumLunasRp = nonExcluded.reduce((s, i) => s + i.primeOwing, 0);
    const belumLunasLbr = nonExcluded.length;
    const selisihRp = belumLunasRp - subtotalRp;
    const selisihLbr = belumLunasLbr - subtotalLbr;

    // Filtering
    const filteredItems = items.filter(i => {
        if (filter === 'UNVERIFIED') return i.status !== 'MATCHED';
        if (filter === 'HILANG') return i.existenceStatus === 'Hilang' || i.existenceStatus === 'HILANG';
        if (filter === 'SALES') return ['DIBAYA SALES', 'DIBAWA SALES', 'Dibawa Sales'].includes(i.existenceStatus || '');
        return true;
    });

    const isVisible = (key: string) => visibleColumns.includes(key);

    const idr = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    // BAFO selisih row handlers
    const addSelisihRow = () => setSelisihRows(prev => [...prev, { customerName: '', transNo: '', piutang: 0, keterangan: '' }]);
    const removeSelisihRow = (idx: number) => setSelisihRows(prev => prev.filter((_, i) => i !== idx));
    const updateSelisihRow = (idx: number, field: keyof SelisihRow, value: string | number) => {
        setSelisihRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };
    const updateSignatory = (key: keyof BAFOSignatories, field: 'nama' | 'tanggal', value: string) => {
        setSignatories(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    const bafoData = () => ({
        periodName,
        cutOffDate,
        docDate: `${docCity}, ${docDate}`,
        sumAda, countAda: adaItems.length,
        sumSales, countSales: salesItems.length,
        sumHilang, countHilang: hilangItems.length,
        belumLunasRp, belumLunasLbr,
        selisihRp, selisihLbr,
        selisihRows,
        signatories,
    });

    const handleBAFOExcel = async () => {
        setBafoExporting(true);
        try {
            const res = await fetch(`/api/so/sessions/${id}/bafo/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cutOffDate,
                    docDate: `${docCity}, ${docDate}`,
                    selisihRows,
                    signatories,
                }),
            });
            if (!res.ok) { alert('Gagal export Excel'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BAFO_${periodName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Error export Excel BAFO');
        } finally {
            setBafoExporting(false);
        }
    };

    const handleBAFOPdf = () => generateBAFOPdf(bafoData());

    if (loading) return <div className="p-12 text-center text-gray-800">Loading Data...</div>;

    const parseDate = (dateStr: string) => {
        if (!dateStr) return null;
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
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
                        <h1 className="text-2xl font-bold text-gray-900">Adjustment &amp; Finalisasi</h1>
                        <p className="text-gray-600 font-medium">
                            {periodName}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${sessionStatus === 'OPEN' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                {sessionStatus}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
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

                            {sessionStatus === 'FINALIZED' && (
                                <>
                                    <button
                                        onClick={() => window.open(`/api/so/sessions/${id}/export`, '_blank')}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition"
                                        title="Download Excel Detail SO"
                                    >
                                        <FileSpreadsheet size={18} />
                                        XLSX
                                    </button>
                                    <button
                                        onClick={() => generatePDF({ periodName, status: sessionStatus }, items)}
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition"
                                        title="Download PDF Detail SO"
                                    >
                                        <FileText size={18} />
                                        PDF
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
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
                        <div className="text-sm text-gray-600 font-bold uppercase">Hilang &amp; Sales</div>
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
                        <button onClick={() => setFilter('SALES')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === 'SALES' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>Dibawa Sales ({sales.length})</button>
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
                                        {isVisible('amount') && <td className="p-3 text-right font-mono text-gray-900 font-bold">{idr(item.amount)}</td>}
                                        {isVisible('primeOwing') && <td className="p-3 text-right font-mono text-red-800 font-bold">{idr(item.primeOwing)}</td>}
                                        {isVisible('description') && <td className="p-3 text-gray-900 italic max-w-xs truncate" title={item.description}>{item.description}</td>}
                                        <td className="p-3 font-bold text-gray-900 text-center">
                                            {item.existenceStatus === 'Ada' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">ADA</span>}
                                            {(item.existenceStatus === 'Hilang' || item.existenceStatus === 'HILANG') && <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">HILANG</span>}
                                            {['DIBAYA SALES', 'DIBAWA SALES', 'Dibawa Sales'].includes(item.existenceStatus || '') && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">SALES</span>}
                                            {(!item.existenceStatus || item.existenceStatus === 'UNVERIFIED') && <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">-</span>}
                                        </td>
                                        <td className="p-3 text-gray-800 font-medium">{item.remarks || '-'}</td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500 font-medium">Tidak ada data sesuai filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ====== BAFO SECTION — only for FINALIZED ====== */}
                {sessionStatus === 'FINALIZED' && (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        {/* BAFO Header */}
                        <div
                            className="p-4 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                            onClick={() => setBafoOpen(o => !o)}
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardList size={20} className="text-blue-700" />
                                <div>
                                    <h2 className="font-bold text-gray-900 text-base">Berita Acara Faktur Opname (BAFO)</h2>
                                    <p className="text-xs text-gray-500">Klik untuk buka / tutup</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={e => { e.stopPropagation(); handleBAFOExcel(); }}
                                    disabled={bafoExporting}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition"
                                >
                                    <FileSpreadsheet size={16} /> BAFO Excel
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); handleBAFOPdf(); }}
                                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition"
                                >
                                    <FileText size={16} /> BAFO PDF
                                </button>
                            </div>
                        </div>

                        {bafoOpen && (
                            <div className="p-6 space-y-6">
                                {/* Tanggal Inputs */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cut Off Tgl</label>
                                        <input
                                            type="text"
                                            value={cutOffDate}
                                            onChange={e => setCutOffDate(e.target.value)}
                                            placeholder="cth: 28 Januari 2026"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-400 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Kota</label>
                                        <input
                                            type="text"
                                            value={docCity}
                                            onChange={e => setDocCity(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-400 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tanggal Dokumen</label>
                                        <input
                                            type="text"
                                            value={docDate}
                                            onChange={e => setDocDate(e.target.value)}
                                            placeholder="cth: 22 Januari 2026"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-400 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Summary Table */}
                                <div>
                                    <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase">Ringkasan Opname</h3>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-blue-50">
                                                    <th className="p-3 text-left font-bold text-gray-700 border-b w-1/2"></th>
                                                    <th className="p-3 text-right font-bold text-gray-700 border-b">Jumlah (Rp)</th>
                                                    <th className="p-3 text-right font-bold text-gray-700 border-b">Jumlah (Lembar)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                <tr>
                                                    <td className="p-3 text-gray-700">Fisik Faktur Ada</td>
                                                    <td className="p-3 text-right font-mono text-blue-700 font-bold">{idr(sumAda)}</td>
                                                    <td className="p-3 text-right font-mono text-blue-700 font-bold">{adaItems.length.toLocaleString('id-ID')}</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-3 text-gray-700">Tukar Faktur</td>
                                                    <td className="p-3 text-right font-mono text-blue-700 font-bold">{idr(sumSales)}</td>
                                                    <td className="p-3 text-right font-mono text-blue-700 font-bold">{salesItems.length.toLocaleString('id-ID')}</td>
                                                </tr>
                                                {hilangItems.length > 0 && (
                                                    <tr>
                                                        <td className="p-3 text-gray-700">Faktur Hilang</td>
                                                        <td className="p-3 text-right font-mono text-red-600 font-bold">{idr(sumHilang)}</td>
                                                        <td className="p-3 text-right font-mono text-red-600 font-bold">{hilangItems.length.toLocaleString('id-ID')}</td>
                                                    </tr>
                                                )}
                                                <tr className="bg-gray-50 border-t-2 border-gray-300">
                                                    <td className="p-3"></td>
                                                    <td className="p-3 text-right font-mono font-bold text-gray-800">{idr(subtotalRp)}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-gray-800">{subtotalLbr.toLocaleString('id-ID')}</td>
                                                </tr>
                                                <tr className="bg-blue-50">
                                                    <td className="p-3 font-bold text-gray-800">Daftar Faktur Belum Lunas</td>
                                                    <td className="p-3 text-right font-mono font-bold text-gray-900">{idr(belumLunasRp)}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-gray-900">{belumLunasLbr.toLocaleString('id-ID')}</td>
                                                </tr>
                                                <tr className={selisihRp !== 0 ? 'bg-red-50' : 'bg-green-50'}>
                                                    <td className="p-3 text-gray-700">Selisih</td>
                                                    <td className={`p-3 text-right font-mono font-bold ${selisihRp !== 0 ? 'text-red-700' : 'text-green-700'}`}>{idr(selisihRp)}</td>
                                                    <td className={`p-3 text-right font-mono font-bold ${selisihLbr !== 0 ? 'text-red-700' : 'text-green-700'}`}>{selisihLbr.toLocaleString('id-ID')}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Penjelasan Selisih */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-gray-700 text-sm uppercase">Penjelasan Selisih</h3>
                                        <button
                                            onClick={addSelisihRow}
                                            className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold transition"
                                        >
                                            <Plus size={13} /> Tambah Baris
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="p-2 text-left font-bold text-gray-600 border-b">Nama Pelanggan</th>
                                                    <th className="p-2 text-left font-bold text-gray-600 border-b">Nomor Invoice</th>
                                                    <th className="p-2 text-right font-bold text-gray-600 border-b">Piutang</th>
                                                    <th className="p-2 text-left font-bold text-gray-600 border-b">Keterangan</th>
                                                    <th className="p-2 border-b w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {selisihRows.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="p-4 text-center text-gray-400 text-xs">
                                                            Belum ada baris penjelasan. Klik "Tambah Baris".
                                                        </td>
                                                    </tr>
                                                )}
                                                {selisihRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="p-1.5">
                                                            <input
                                                                type="text"
                                                                value={row.customerName}
                                                                onChange={e => updateSelisihRow(idx, 'customerName', e.target.value)}
                                                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 focus:ring-1 focus:ring-blue-400 outline-none"
                                                                placeholder="Nama pelanggan..."
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <input
                                                                type="text"
                                                                value={row.transNo}
                                                                onChange={e => updateSelisihRow(idx, 'transNo', e.target.value)}
                                                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono text-gray-900 focus:ring-1 focus:ring-blue-400 outline-none"
                                                                placeholder="No. faktur..."
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <input
                                                                type="number"
                                                                value={row.piutang}
                                                                onChange={e => updateSelisihRow(idx, 'piutang', parseFloat(e.target.value) || 0)}
                                                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right font-mono text-gray-900 focus:ring-1 focus:ring-blue-400 outline-none"
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="p-1.5">
                                                            <input
                                                                type="text"
                                                                value={row.keterangan}
                                                                onChange={e => updateSelisihRow(idx, 'keterangan', e.target.value)}
                                                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 focus:ring-1 focus:ring-blue-400 outline-none"
                                                                placeholder="Retur / Selisih / ..."
                                                            />
                                                        </td>
                                                        <td className="p-1.5 text-center">
                                                            <button
                                                                onClick={() => removeSelisihRow(idx)}
                                                                className="text-red-400 hover:text-red-600 transition"
                                                                title="Hapus baris"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Tanda Tangan */}
                                <div>
                                    <h3 className="font-bold text-gray-700 text-sm uppercase mb-3">Tanda Tangan</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {(
                                            [
                                                { key: 'pemegangInvoice', label: 'Pemegang Invoice' },
                                                { key: 'petugasOpname', label: 'Petugas Opname' },
                                                { key: 'faSPV', label: 'FA SPV' },
                                                { key: 'fam', label: 'FAM' },
                                            ] as { key: keyof BAFOSignatories; label: string }[]
                                        ).map(({ key, label }) => (
                                            <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <div className="bg-gray-50 px-3 py-2 text-center font-bold text-xs text-gray-700 border-b">{label}</div>
                                                <div className="h-16 bg-white"></div>
                                                <div className="border-t px-2 py-1.5 space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-gray-500 font-bold w-12">Nama:</span>
                                                        <input
                                                            type="text"
                                                            value={signatories[key].nama}
                                                            onChange={e => updateSignatory(key, 'nama', e.target.value)}
                                                            className="flex-1 text-[11px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-900 focus:ring-1 focus:ring-blue-400 outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-gray-500 font-bold w-12">Tgl:</span>
                                                        <input
                                                            type="text"
                                                            value={signatories[key].tanggal}
                                                            onChange={e => updateSignatory(key, 'tanggal', e.target.value)}
                                                            className="flex-1 text-[11px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-900 focus:ring-1 focus:ring-blue-400 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom export */}
                                <div className="flex gap-3 justify-end pt-2 border-t">
                                    <button
                                        onClick={handleBAFOExcel}
                                        disabled={bafoExporting}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-bold shadow transition"
                                    >
                                        <Download size={16} /> Export BAFO Excel
                                    </button>
                                    <button
                                        onClick={handleBAFOPdf}
                                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-lg font-bold shadow transition"
                                    >
                                        <FileText size={16} /> Export BAFO PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
