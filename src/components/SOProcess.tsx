"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { AccurateService, FilterOptions } from "@/services/accurate";
import { Invoice } from "@/types";
import { Scan, RefreshCw, CheckCircle, AlertTriangle, FileWarning, Filter, ArrowUp, ArrowDown } from "lucide-react";

export default function SOProcess() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadCount, setLoadCount] = useState(0);
    const [scanInput, setScanInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter State (API)
    const [filters, setFilters] = useState<FilterOptions>({
        owingStatus: 'UNPAID',
        fromDate: '',
        toDate: '',
        accurateStatus: ''
    });

    // Local Table Sort & Filter
    const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice; direction: 'asc' | 'desc' } | null>(null);
    const [colFilters, setColFilters] = useState<{ [key: string]: string }>({});

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Derived State: Filtered & Sorted Invoices
    const processedInvoices = useMemo(() => {
        let data = [...invoices];

        // 1. Column Filtering
        Object.keys(colFilters).forEach((key) => {
            const value = colFilters[key].toLowerCase();
            if (value) {
                data = data.filter((inv) => {
                    const itemVal = String((inv as any)[key] || '').toLowerCase();
                    return itemVal.includes(value);
                });
            }
        });

        // 2. Sorting
        if (sortConfig) {
            data.sort((a, b) => {
                const aVal = (a as any)[sortConfig.key];
                const bVal = (b as any)[sortConfig.key];

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [invoices, sortConfig, colFilters]);

    const handleSort = (key: keyof Invoice) => {
        setSortConfig((current) => {
            if (current?.key === key && current.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        setColFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleImport = async () => {
        setLoading(true);
        setLoadCount(0);
        try {
            const data = await AccurateService.fetchOutstandingInvoices(filters, (count) => {
                setLoadCount(count);
            });
            setInvoices(data);
        } catch (error) {
            console.error("Failed to import", error);
            alert("Terjadi kesalahan saat import data. Cek console log.");
        } finally {
            setLoading(false);
        }
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanInput) return;

        const scannedCode = scanInput.trim().toUpperCase();

        setInvoices((prev) => {
            const exists = prev.find((inv) => inv.transNo === scannedCode);

            if (exists) {
                // Mark as MATCHED
                return prev.map((inv) =>
                    inv.transNo === scannedCode
                        ? { ...inv, status: "MATCHED", scannedAt: new Date().toISOString() }
                        : inv
                );
            } else {
                alert(`Invoice ${scannedCode} not found in system!`);
                return prev;
            }
        });

        setScanInput("");
        // Fix: Auto re-focus for continuous scanning
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    const matchedCount = invoices.filter((i) => i.status === "MATCHED").length;
    const pendingCount = invoices.length - matchedCount;

    return (
        <div className="flex flex-col h-screen max-w-full mx-auto p-2 gap-2 bg-gray-50">
            {/* Header Compact */}
            <header className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border shrink-0">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Gama Agro Sejati" className="h-10 w-auto object-contain" />
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">Review SO Faktur Mingguan</h1>
                        <p className="text-xs text-gray-500">Scan barcode faktur fisik untuk verifikasi.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="bg-yellow-100 px-3 py-1 rounded-md border border-yellow-200">
                        <span className="block text-[10px] uppercase text-yellow-700 font-bold">Pending</span>
                        <span className="text-xl font-mono text-yellow-800">{pendingCount}</span>
                    </div>
                    <div className="bg-green-100 px-3 py-1 rounded-md border border-green-200">
                        <span className="block text-[10px] uppercase text-green-700 font-bold">Verified</span>
                        <span className="text-xl font-mono text-green-800">{matchedCount}</span>
                    </div>
                </div>
            </header>

            {/* Filters Compact */}
            <div className="bg-white p-3 rounded-lg shadow-sm border space-y-3 relative z-20 shrink-0">
                <div className="flex items-center gap-2 text-gray-800 font-bold pb-1 border-b">
                    <Filter size={16} className="text-blue-600" />
                    <span className="text-sm">Filter Data Import</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Status Piutang</label>
                        <div className="relative">
                            <select
                                className="w-full p-2 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 font-bold appearance-none cursor-pointer"
                                value={filters.owingStatus}
                                onChange={(e) => setFilters(prev => ({ ...prev, owingStatus: e.target.value as any }))}
                            >
                                <option value="UNPAID">Belum Lunas</option>
                                <option value="PAID">Lunas</option>
                                <option value="ALL">Semua</option>
                            </select>
                            {/* Arrow Icon */}
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Dari Tanggal</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                            value={filters.fromDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Sampai Tanggal</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                            value={filters.toDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Status Accurate</label>
                        <input
                            type="text"
                            placeholder="Contoh: Dihapus"
                            className="w-full p-2 border border-gray-300 rounded text-xs text-gray-900 bg-white focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                            value={filters.accurateStatus}
                            onChange={(e) => setFilters(prev => ({ ...prev, accurateStatus: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        onClick={handleImport}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-bold text-sm transition shadow-sm active:scale-95"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="animate-spin w-4 h-4" />
                                Loading... ({loadCount})
                            </>
                        ) : <RefreshCw className="w-4 h-4" />}
                        {invoices.length > 0 && !loading ? "Reset Data" : (!loading && "Import Data")}
                    </button>

                    <form onSubmit={handleScan} className="md:col-span-2 relative h-10">
                        <input
                            ref={inputRef}
                            type="text"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            placeholder="Scan Barcode Disini..."
                            className="w-full h-full text-lg px-4 rounded-lg border-2 border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 shadow-inner font-mono font-bold text-black placeholder-gray-500"
                            autoFocus
                        />
                        <Scan className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </form>
                </div>
            </div>

            {/* Data Table Expanded */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col min-h-0">
                <div className="p-2 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-gray-700 text-sm">Invoices List</h2>
                    <span className="text-xs text-gray-500 font-mono bg-gray-200 px-2 py-0.5 rounded">{invoices.length} Items</span>
                </div>
                <div className="overflow-auto flex-1 h-full">
                    <table className="w-full text-left border-collapse text-xs relative">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {/* Status SO */}
                                <th className="p-2 border-b w-24 align-top">
                                    <div className="flex flex-col gap-1">
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                                            onClick={() => handleSort('status')}
                                        >
                                            <span className="font-bold">Status</span>
                                            {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cari..."
                                            className="w-full p-1 text-[10px] border rounded"
                                            value={colFilters['status'] || ''}
                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                        />
                                    </div>
                                </th>

                                {/* No Faktur */}
                                <th className="p-2 border-b align-top">
                                    <div className="flex flex-col gap-1">
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                                            onClick={() => handleSort('transNo')}
                                        >
                                            <span className="font-bold">No Faktur</span>
                                            {sortConfig?.key === 'transNo' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cari No..."
                                            className="w-full p-1 text-[10px] border rounded"
                                            value={colFilters['transNo'] || ''}
                                            onChange={(e) => handleFilterChange('transNo', e.target.value)}
                                        />
                                    </div>
                                </th>

                                {/* Tanggal */}
                                <th className="p-2 border-b align-top">
                                    <div className="flex flex-col gap-1">
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                                            onClick={() => handleSort('transDate')}
                                        >
                                            <span className="font-bold">Tanggal</span>
                                            {sortConfig?.key === 'transDate' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cari Tgl..."
                                            className="w-full p-1 text-[10px] border rounded"
                                            value={colFilters['transDate'] || ''}
                                            onChange={(e) => handleFilterChange('transDate', e.target.value)}
                                        />
                                    </div>
                                </th>

                                {/* Customer */}
                                <th className="p-2 border-b align-top">
                                    <div className="flex flex-col gap-1">
                                        <div
                                            className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                                            onClick={() => handleSort('customerName')}
                                        >
                                            <span className="font-bold">Customer</span>
                                            {sortConfig?.key === 'customerName' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cari Nama..."
                                            className="w-full p-1 text-[10px] border rounded"
                                            value={colFilters['customerName'] || ''}
                                            onChange={(e) => handleFilterChange('customerName', e.target.value)}
                                        />
                                    </div>
                                </th>

                                {/* Keterangan */}
                                <th className="p-2 border-b align-top">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold">Keterangan</span>
                                        <input
                                            type="text"
                                            placeholder="Cari Ket..."
                                            className="w-full p-1 text-[10px] border rounded"
                                            value={colFilters['description'] || ''}
                                            onChange={(e) => handleFilterChange('description', e.target.value)}
                                        />
                                    </div>
                                </th>

                                <th className="p-2 border-b font-bold align-top">Status Accurate</th>
                                <th className="p-2 border-b text-right font-bold bg-yellow-50 align-top">Total Nilai</th>
                                <th className="p-2 border-b text-center font-bold align-top">Status Lunas</th>
                                <th className="p-2 border-b text-right font-bold bg-red-50 align-top">Sisa Tagihan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedInvoices.map((inv) => (
                                <tr key={inv.id} className={`border-b hover:bg-blue-50 transition-colors ${inv.status === 'MATCHED' ? 'bg-green-50' : ''}`}>
                                    <td className="p-2">
                                        {inv.status === "MATCHED" ? (
                                            <span className="inline-flex items-center gap-1 text-green-700 font-bold px-2 py-0.5 rounded bg-green-200 text-[10px]">
                                                <CheckCircle size={10} /> OK
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-gray-400 font-medium px-2 py-0.5 rounded bg-gray-100 text-[10px]">
                                                <AlertTriangle size={10} /> PENDING
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2 font-mono font-bold text-blue-600">{inv.transNo}</td>
                                    <td className="p-2 text-gray-600">
                                        {inv.transDate}
                                        {inv.dueDate && <div className="text-[10px] text-red-400">Due: {inv.dueDate}</div>}
                                    </td>
                                    <td className="p-2 text-gray-900 font-semibold">{inv.customerName}</td>
                                    <td className="p-2 text-gray-500 max-w-[150px] truncate" title={inv.description}>
                                        {inv.description || "-"}
                                    </td>
                                    <td className="p-2">
                                        <div className="font-bold text-gray-700">{inv.statusName}</div>
                                        <div className="text-gray-400 text-[10px]">{inv.approvalStatus}</div>
                                    </td>
                                    <td className="p-2 text-right font-mono text-gray-600 bg-yellow-50/50">
                                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(inv.amount)}
                                    </td>
                                    <td className="p-2 text-center">
                                        {inv.primeOwing > 0 ? (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                                BELUM
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                                                LUNAS
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-red-600 bg-red-50/50">
                                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(inv.primeOwing)}
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-gray-400">
                                        <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <div className="text-sm">Belum ada data. Silakan atur Filter dan klik Import Data.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
