"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Scan, ArrowLeft, CheckCircle, AlertTriangle, Search, ArrowRight, ArrowUp, ArrowDown, Download, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import CameraScanner from "./CameraScanner";
import { TableVirtuoso, Virtuoso } from "react-virtuoso";

interface SoItem {
    id: string;
    transNo: string;
    transDate: string;
    dueDate?: string | null;
    customerName: string;
    description: string | null;
    statusName?: string | null;
    approvalStatus?: string | null;
    amount: number;
    outstanding: number;
    primeOwing: number;
    status: string; // UNVERIFIED, MATCHED
    scannedAt: Date | string | null;
    existenceStatus?: string | null;
    remarks?: string | null;
}

const COLUMNS = [
    { key: 'status', label: 'Status', width: 100 },
    { key: 'transNo', label: 'No Faktur', width: 140 },
    { key: 'transDate', label: 'Tanggal', width: 100 },
    { key: 'customerName', label: 'Customer', width: 180 },
    { key: 'description', label: 'Keterangan', width: 200 },
    { key: 'statusName', label: 'Status Acc', width: 100 },
    { key: 'amount', label: 'Total Nilai', width: 120, align: 'right' },
    { key: 'primeOwing', label: 'Status Lunas', width: 100, align: 'center' }, // Logic based
    { key: 'primeOwing', label: 'Sisa Tagihan', width: 120, align: 'right' },
    { key: 'existenceStatus', label: 'Keberadaan', width: 130 },
    { key: 'remarks', label: 'Ket. Tambahan', width: 200 }
];

const ScannerRow = React.memo(_ScannerRow);

function _ScannerRow({ item, onUpdate }: {
    item: SoItem;
    onUpdate: (id: string, field: string, value: string) => void;
}) {
    // Local state for immediate UI feedback before API confirms
    const [existence, setExistence] = useState(item.existenceStatus || "");
    const [remarks, setRemarks] = useState(item.remarks || "");

    useEffect(() => {
        setExistence(item.existenceStatus || "");
        setRemarks(item.remarks || "");
    }, [item.existenceStatus, item.remarks]);

    const handleExistenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setExistence(val);
        onUpdate(item.id, 'existenceStatus', val);
    };

    const handleRemarksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRemarks(val);
    };

    const handleRemarksBlur = () => {
        if (remarks !== (item.remarks || "")) {
            onUpdate(item.id, 'remarks', remarks);
        }
    };

    const getCustomerStyle = () => {
        switch (existence) {
            case 'Ada': return 'bg-green-200 text-green-900 border border-green-300';
            case 'Dibawa Sales': return 'bg-yellow-100 text-yellow-900 border border-yellow-300';
            case 'Hilang': return 'bg-red-200 text-red-900 border border-red-300';
            default: return 'text-gray-800';
        }
    };

    return (
        <tr id={`row-${item.transNo}`} className={`hover:bg-gray-50 ${item.status === 'MATCHED' ? 'bg-green-50' : ''}`}>
            {/* Status (100) */}
            <td className="p-3" style={{ width: 100 }}>
                {item.status === 'MATCHED' ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-200 px-2 py-1 rounded">
                        <CheckCircle size={12} /> OK
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400 font-bold text-xs bg-gray-100 px-2 py-1 rounded">
                        <AlertTriangle size={12} /> PENDING
                    </span>
                )}
            </td>
            {/* No Faktur (140) */}
            <td className="p-3 font-mono font-bold text-blue-600" style={{ width: 140 }}>
                {item.transNo}
            </td>
            {/* Tanggal (100) */}
            <td className="p-3 text-gray-600" style={{ width: 100 }}>
                {item.transDate}
                {item.dueDate && <div className="text-[10px] text-red-500">Due: {item.dueDate}</div>}
            </td>
            {/* Customer (180) */}
            <td className="p-3" style={{ width: 180 }}>
                <div className={`font-bold px-2 py-1 rounded inline-block text-sm ${getCustomerStyle()}`}>
                    {item.customerName}
                </div>
            </td>
            {/* Keterangan (200) */}
            <td className="p-3 text-gray-500 truncate" title={item.description || ''} style={{ width: 200 }}>
                {item.description || '-'}
            </td>
            {/* Status Acc (100) */}
            <td className="p-3" style={{ width: 100 }}>
                <div className="font-bold text-gray-700">{item.statusName || '-'}</div>
                <div className="text-[10px] text-gray-400">{item.approvalStatus}</div>
            </td>
            {/* Total Nilai (120) */}
            <td className="p-3 text-right font-mono font-bold text-gray-700 bg-yellow-50/50" style={{ width: 120 }}>
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.amount)}
            </td>
            {/* Status Lunas (100) */}
            <td className="p-3 text-center" style={{ width: 100 }}>
                {item.primeOwing > 0 ? (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                        BELUM
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                        LUNAS
                    </span>
                )}
            </td>
            {/* Sisa Tagihan (120) */}
            <td className="p-3 text-right font-mono font-bold text-red-600 bg-red-50/50" style={{ width: 120 }}>
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.primeOwing)}
            </td>
            {/* Keberadaan (130) */}
            <td className="p-3" style={{ width: 130 }}>
                <select
                    className={`w-full text-xs p-1 border rounded font-bold ${existence === 'Ada' ? 'bg-green-100 text-green-800 border-green-300' : existence === 'Hilang' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-white border-gray-300 text-gray-900'}`}
                    value={existence}
                    onChange={handleExistenceChange}
                >
                    <option value="">- Pilih -</option>
                    <option value="Ada">Ada</option>
                    <option value="Hilang">Hilang</option>
                    <option value="Dibawa Sales">Dibawa Sales</option>
                </select>
            </td>
            {/* Ket. Tambahan (200) */}
            <td className="p-3" style={{ width: 200 }}>
                <input
                    type="text"
                    className="w-full text-xs p-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
                    placeholder="Ket. tambahan..."
                    value={remarks}
                    onChange={handleRemarksChange}
                    onBlur={handleRemarksBlur}
                />
            </td>
        </tr>
    );
}

const ScannerCard = React.memo(function ScannerCard({ item, onUpdate }: {
    item: SoItem;
    onUpdate: (id: string, field: string, value: string) => void;
}) {
    const [existence, setExistence] = useState(item.existenceStatus || "");
    const [remarks, setRemarks] = useState(item.remarks || "");

    useEffect(() => {
        setExistence(item.existenceStatus || "");
        setRemarks(item.remarks || "");
    }, [item]);

    const handleExistenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setExistence(val);
        onUpdate(item.id, 'existenceStatus', val);
    };

    const handleRemarksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRemarks(val);
    };

    const handleRemarksBlur = () => {
        if (remarks !== (item.remarks || "")) {
            onUpdate(item.id, 'remarks', remarks);
        }
    };

    return (
        <div id={`card-${item.transNo}`} className={`bg-white p-4 rounded-lg shadow-sm border mb-3 ${item.status === 'MATCHED' ? 'border-green-300 ring-1 ring-green-100' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-mono font-bold text-lg text-blue-600">{item.transNo}</div>
                    <div className="text-sm font-bold text-gray-800">{item.customerName}</div>
                    <div className="text-xs text-gray-500">{item.transDate}</div>
                </div>
                <div className="text-right">
                    {item.status === 'MATCHED' ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-bold text-xs bg-green-200 px-2 py-1 rounded">
                            <CheckCircle size={12} /> OK
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 font-bold text-xs bg-gray-100 px-2 py-1 rounded">
                            <AlertTriangle size={12} /> PENDING
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="bg-gray-50 p-2 rounded">
                    <div className="text-[10px] text-gray-500 uppercase">Nilai Faktur</div>
                    <div className="font-bold text-gray-700">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.amount)}
                    </div>
                </div>
                <div className="bg-red-50 p-2 rounded">
                    <div className="text-[10px] text-red-500 uppercase">Sisa Tagihan</div>
                    <div className="font-bold text-red-700">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.primeOwing)}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Status Barang</label>
                    <select
                        className={`w-full text-sm p-2 border rounded font-bold ${existence === 'Ada' ? 'bg-green-100 text-green-800 border-green-300' : existence === 'Hilang' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-white border-gray-300 text-gray-900'}`}
                        value={existence}
                        onChange={handleExistenceChange}
                    >
                        <option value="">- Pilih Status Barang -</option>
                        <option value="Ada">Ada</option>
                        <option value="Hilang">Hilang</option>
                        <option value="Dibawa Sales">Dibawa Sales</option>
                    </select>
                </div>
                <div>
                    <input
                        type="text"
                        className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
                        placeholder="Keterangan tambahan..."
                        value={remarks}
                        onChange={handleRemarksChange}
                        onBlur={handleRemarksBlur}
                    />
                </div>
            </div>
            {item.description && (
                <div className="mt-2 text-xs text-gray-500 italic border-t pt-2">
                    {item.description}
                </div>
            )}
        </div>
    )
});

export default function ScannerInterface({
    sessionId,
    periodName,
    initialItems
}: {
    sessionId: string,
    periodName: string,
    initialItems: SoItem[]
}) {
    const router = useRouter();
    const [items, setItems] = useState<SoItem[]>(initialItems);
    const [scanInput, setScanInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const [showCamera, setShowCamera] = useState(false);

    // Sort & Filter State
    const [sortConfig, setSortConfig] = useState<{ key: keyof SoItem; direction: 'asc' | 'desc' } | null>(null);
    const [colFilters, setColFilters] = useState<{ [key: string]: string }>({});

    // Stats
    const matchedCount = items.filter(i => i.status === 'MATCHED').length;
    const adas = items.filter(i => i.existenceStatus === 'Ada').length;
    const hilangs = items.filter(i => i.existenceStatus === 'Hilang').length;
    const sales = items.filter(i => i.existenceStatus === 'Dibawa Sales').length;
    const pendingCount = items.length - matchedCount;

    // Focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSort = (key: keyof SoItem) => {
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

    // Derived State: Filtered & Sorted Items
    const processedItems = useMemo(() => {
        let data = [...items];

        // 0. Global Search (keep this as general filter)
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            data = data.filter(i =>
                i.transNo.toLowerCase().includes(q) ||
                i.customerName.toLowerCase().includes(q)
            );
        }

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
    }, [items, sortConfig, colFilters, searchQuery]);

    // Use Ref to keep track of items for callbacks without triggering re-creation
    const itemsRef = useRef(items);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const handleUpdateItem = useCallback(async (id: string, field: string, value: string) => {
        // Access latest items via ref to avoid stale closure
        const currentItems = itemsRef.current;
        const currentItem = currentItems.find(i => i.id === id);

        if (!currentItem) return;

        // Calculate Logic Synchronously based on Current State
        let newStatus: string | undefined = undefined;
        let additionalUpdates: Partial<SoItem> = {};

        let nextExistence = currentItem.existenceStatus || "";
        let nextRemarks = currentItem.remarks || "";

        if (field === 'existenceStatus') nextExistence = value;
        if (field === 'remarks') nextRemarks = value;

        if (nextExistence === 'Ada') {
            newStatus = 'MATCHED';
        } else if ((nextExistence === 'Hilang' || nextExistence === 'Dibawa Sales') && nextRemarks.trim() !== "") {
            newStatus = 'MATCHED';
        } else if ((nextExistence === 'Hilang' || nextExistence === 'Dibawa Sales') && nextRemarks.trim() === "") {
            newStatus = 'UNVERIFIED';
        }

        if (newStatus && newStatus !== currentItem.status) {
            additionalUpdates = { status: newStatus };
        }

        const updates = { [field]: value, ...additionalUpdates };

        // Optimistic Update
        setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

        try {
            await fetch(`/api/so/items/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.error("Update failed", error);
        }
    }, []);

    const processScan = async (code: string) => {
        code = code.trim().toUpperCase();

        // Optimistic Check
        const exists = items.find(i => i.transNo === code);
        if (!exists) {
            alert(`Faktur ${code} tidak ditemukan dalam daftar SO ini!`);
            return;
        }

        if (exists.status === 'MATCHED') {
            alert(`Faktur ${code} sudah discan sebelumnya!`);
            return;
        }

        try {
            // Call API
            const res = await fetch('/api/so/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, barcode: code })
            });

            const data = await res.json();

            if (data.success) {
                // Update Local State with data from server (which includes default existenceStatus)
                setItems(prev => prev.map(inv =>
                    inv.transNo === code ? {
                        ...inv,
                        status: 'MATCHED',
                        scannedAt: new Date().toISOString(),
                        existenceStatus: 'Ada' // Default
                    } : inv
                ));

                // Auto Scroll to Item
                setTimeout(() => {
                    const element = document.getElementById(`row-${code}`) || document.getElementById(`card-${code}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Optional: Add a flash effect via class manipulation if needed, but styling is enough for now
                        element.classList.add('bg-blue-50');
                        setTimeout(() => element.classList.remove('bg-blue-50'), 2000);
                    }
                }, 100);
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
            alert("Gagal menghubungi server");
        }
    };

    const handleManualScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanInput) return;
        await processScan(scanInput);
        setScanInput("");
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleExport = () => {
        window.open(`/api/so/sessions/${sessionId}/export`, '_blank');
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {showCamera && (
                <div className="fixed inset-0 z-50 bg-black">
                    <button
                        onClick={() => setShowCamera(false)}
                        className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full text-black"
                    >
                        <ArrowLeft />
                    </button>
                    <CameraScanner
                        onScan={(code) => {
                            setShowCamera(false);
                            processScan(code);
                        }}
                    />
                </div>
            )}

            {/* Header / Top Bar */}
            <div className="bg-white p-4 border-b flex flex-col md:flex-row gap-4 items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center w-full md:w-auto gap-4">
                    <button onClick={() => router.push('/dashboard')} className="p-2 border rounded-full hover:bg-gray-100 transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg">{periodName}</h1>
                        <p className="text-xs text-gray-500">Mode Scanning (v1.2)</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="px-4 py-2 bg-blue-50 rounded-lg text-center min-w-[80px]">
                        <div className="text-[10px] uppercase font-bold text-blue-500">Total</div>
                        <div className="font-bold text-xl text-blue-700">{items.length}</div>
                    </div>
                    <div className="px-4 py-2 bg-yellow-50 rounded-lg text-center min-w-[80px]">
                        <div className="text-[10px] uppercase font-bold text-yellow-600">Pending</div>
                        <div className="font-bold text-xl text-yellow-700">{pendingCount}</div>
                    </div>
                    <div className="px-4 py-2 bg-green-50 rounded-lg text-center min-w-[80px]">
                        <div className="text-[10px] uppercase font-bold text-green-600">OK</div>
                        <div className="font-bold text-xl text-green-700">{matchedCount}</div>
                    </div>

                    <div className="w-px bg-gray-300 mx-2"></div>

                    <div className="px-3 py-1 bg-blue-100 rounded text-center min-w-[60px]">
                        <div className="text-[10px] font-bold text-blue-800">ADA</div>
                        <div className="font-bold text-lg text-blue-900">{adas}</div>
                    </div>
                    <div className="px-3 py-1 bg-red-100 rounded text-center min-w-[60px]">
                        <div className="text-[10px] font-bold text-red-800">HILANG</div>
                        <div className="font-bold text-lg text-red-900">{hilangs}</div>
                    </div>
                    <div className="px-3 py-1 bg-orange-100 rounded text-center min-w-[60px]">
                        <div className="text-[10px] font-bold text-orange-800">SALES</div>
                        <div className="font-bold text-lg text-orange-900">{sales}</div>
                    </div>
                </div>

                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={handleExport}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition"
                    >
                        <Download size={18} /> Excel
                    </button>
                    <button
                        onClick={() => router.push(`/so/sessions/${sessionId}/approve`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition"
                    >
                        Selesai Scan <ArrowRight size={18} />
                    </button>
                </div>
            </div>

            {/* Input Bar */}
            <div className="bg-white p-4 border-b shadow-sm z-10">
                <form onSubmit={handleManualScan} className="flex gap-2">
                    <div className="relative flex-1">
                        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            className="w-full p-3 pl-10 border-2 border-blue-200 rounded-lg text-lg font-mono focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none"
                            placeholder="SCAN BARCODE..."
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="h-12 w-12 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md active:scale-95 transition"
                        title="Buka Kamera"
                    >
                        <Camera size={24} />
                    </button>
                </form>

                {/* Search Bar for manual lookup */}
                <div className="mt-2 relative">
                    <input
                        type="text"
                        placeholder="Cari No Faktur / Customer manual..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 pl-9 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:bg-white focus:ring-1 focus:border-blue-500 transition shadow-sm"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-2 md:p-4">
                <div className="hidden md:block bg-white rounded-lg shadow-sm border overflow-hidden h-full">
                    <TableVirtuoso
                        style={{ height: 'calc(100vh - 250px)' }}
                        data={processedItems}
                        components={{
                            Table: (props) => (
                                <table {...props} className="w-full border-collapse table-fixed" style={{ ...props.style, minWidth: 1490 }}>
                                    <colgroup>
                                        {COLUMNS.map((col, idx) => (
                                            <col key={idx} style={{ width: col.width }} />
                                        ))}
                                    </colgroup>
                                    {props.children}
                                </table>
                            ),
                            // Fix for double TR issue: Pass props to child (ScannerRow) instead of wrapping
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            TableRow: (props: any) => {
                                const child = React.Children.only(props.children);
                                return React.cloneElement(child, {
                                    ...props,
                                    // Merge className if needed, though usually empty from Virtuoso
                                    className: `${child.props.className || ''} ${props.className || ''}`.trim(),
                                    style: { ...child.props.style, ...props.style }
                                });
                            }
                        }}
                        fixedHeaderContent={() => (
                            <tr className="bg-gray-100 text-gray-600 border-b shadow-sm">
                                {COLUMNS.map((col, idx) => (
                                    <th key={idx} style={{ width: col.width }} className={`p-3 border-b align-top bg-gray-100 ${idx > 0 ? 'border-l border-gray-200' : ''}`}>
                                        <div className="flex flex-col gap-1">
                                            <div
                                                className={`flex items-center gap-1 cursor-pointer hover:text-blue-600 font-bold ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}
                                                onClick={() => handleSort(col.key as keyof SoItem)}
                                            >
                                                {col.label}
                                                {sortConfig && sortConfig.key === col.key && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                            </div>
                                            {/* Optional: Filter Input if needed per column */}
                                            {['status', 'transNo', 'transDate', 'customerName', 'description', 'statusName', 'existenceStatus', 'remarks'].includes(col.key) && (
                                                <input
                                                    type="text"
                                                    placeholder="Filter..."
                                                    className="w-full p-1 text-[10px] border rounded font-normal"
                                                    value={colFilters[col.key] || ''}
                                                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                                />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        )}
                        itemContent={(index, item) => (
                            <ScannerRow key={item.id} item={item} onUpdate={handleUpdateItem} />
                        )}
                    />
                </div>

                <div className="md:hidden">
                    <Virtuoso
                        style={{ height: 'calc(100vh - 250px)' }}
                        data={processedItems}
                        itemContent={(index, item) => (
                            <ScannerCard key={item.id} item={item} onUpdate={handleUpdateItem} />
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
