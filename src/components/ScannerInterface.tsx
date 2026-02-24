"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Scan, ArrowLeft, CheckCircle, AlertTriangle, Search, ArrowRight, ArrowUp, ArrowDown, Download, Camera, UserX, X as XIcon } from "lucide-react";
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

// Define Virtuoso components outside to ensure stability and prevent re-renders
const VirtuosoComponents = {
    Table: (props: any) => (
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
    TableRow: (props: any) => {
        const child = React.Children.only(props.children) as React.ReactElement;
        return React.cloneElement(child, {
            ...props,
            // Merge className if needed, though usually empty from Virtuoso
            className: `${child.props.className || ''} ${props.className || ''}`.trim(),
            style: { ...child.props.style, ...props.style }
        });
    }
};



const _ScannerRow = React.forwardRef<HTMLTableRowElement, {
    item: SoItem;
    onUpdate: (id: string, field: string, value: string) => void;
    style?: React.CSSProperties; // Add style prop from Virtuoso
    className?: string; // Add className prop
}>(({ item, onUpdate, style, className, ...props }, ref) => {

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
            case 'Exclude': return 'bg-purple-200 text-purple-900 border border-purple-300';
            default: return 'text-gray-800';
        }
    };

    return (
        <tr
            ref={ref}
            {...props}
            id={`row-${item.transNo}`}
            className={`hover:bg-gray-50 ${item.status === 'MATCHED' ? 'bg-green-50' : 'bg-white'} ${className || ''}`}
            style={{ ...style }} // Merge style from Virtuoso
        >
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
});

const ScannerRow = React.memo(_ScannerRow);

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
                        <option value="Exclude">Exclude</option>
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
    const virtuosoRef = useRef<any>(null);
    const mobileVirtuosoRef = useRef<any>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [scrollTarget, setScrollTarget] = useState<string | null>(null);



    // Sort & Filter State
    const [sortConfig, setSortConfig] = useState<{ key: keyof SoItem; direction: 'asc' | 'desc' } | null>(null);
    const [colFilters, setColFilters] = useState<{ [key: string]: string }>({});

    // Stats
    const excludedItems = items.filter(i => i.existenceStatus === 'Exclude');
    const nonExcludedItems = items.filter(i => i.existenceStatus !== 'Exclude');
    const matchedCount = nonExcludedItems.filter(i => i.status === 'MATCHED').length;
    const adas = items.filter(i => i.existenceStatus === 'Ada').length;
    const hilangs = items.filter(i => i.existenceStatus === 'Hilang').length;
    const sales = items.filter(i => i.existenceStatus === 'Dibawa Sales').length;
    const excludeCount = excludedItems.length;
    const pendingCount = nonExcludedItems.length - matchedCount;

    // Exclude Customer Modal State
    interface CustomerInfo {
        name: string;
        invoiceCount: number;
        totalAmount: number;
        totalOwing: number;
        isExcluded: boolean;
    }
    const [showExcludeModal, setShowExcludeModal] = useState(false);
    const [excludeCustomers, setExcludeCustomers] = useState<CustomerInfo[]>([]);
    const [excludeSelected, setExcludeSelected] = useState<Set<string>>(new Set());
    const [excludeLoading, setExcludeLoading] = useState(false);
    const [excludeSaving, setExcludeSaving] = useState(false);
    const [excludeSearch, setExcludeSearch] = useState('');

    const openExcludeModal = async () => {
        setShowExcludeModal(true);
        setExcludeLoading(true);
        try {
            const res = await fetch(`/api/so/sessions/${sessionId}/exclude`);
            const data = await res.json();
            setExcludeCustomers(data.customers || []);
            setExcludeSelected(new Set((data.excludedCustomers || []) as string[]));
        } catch (e) {
            console.error('Failed to load exclude data:', e);
        } finally {
            setExcludeLoading(false);
        }
    };

    const toggleExcludeCustomer = (name: string) => {
        setExcludeSelected(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const saveExcludeCustomers = async () => {
        setExcludeSaving(true);
        try {
            const res = await fetch(`/api/so/sessions/${sessionId}/exclude`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ excludedCustomers: Array.from(excludeSelected) })
            });
            const data = await res.json();
            if (data.success) {
                // Refresh items from server
                const sessionRes = await fetch(`/api/so/sessions/${sessionId}`);
                const sessionData = await sessionRes.json();
                if (sessionData.session?.items) {
                    setItems(sessionData.session.items);
                }
                setShowExcludeModal(false);
            } else {
                alert(data.error || 'Gagal menyimpan');
            }
        } catch (e) {
            alert('Error menyimpan exclude customers');
        } finally {
            setExcludeSaving(false);
        }
    };

    const formatCurrencyShort = (n: number) => {
        if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)}M`;
        if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}jt`;
        if (n >= 1_000) return `Rp${(n / 1_000).toFixed(0)}rb`;
        return `Rp${n}`;
    };

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

    // Auto-scroll effect (must be after processedItems definition)
    useEffect(() => {
        if (!scrollTarget) return;

        const index = processedItems.findIndex(i => i.transNo === scrollTarget);
        if (index !== -1) {
            // Both components are always mounted (hidden via CSS),
            // so scroll both — whichever is visible will respond
            const scrollOpts = { index, align: 'center' as const, behavior: 'smooth' as const };

            if (virtuosoRef.current) {
                virtuosoRef.current.scrollToIndex(scrollOpts);
            }
            if (mobileVirtuosoRef.current) {
                mobileVirtuosoRef.current.scrollToIndex(scrollOpts);
            }
            setScrollTarget(null);
        }
    }, [scrollTarget, processedItems]);

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

                // Auto Scroll handled by useEffect
                setScrollTarget(code);
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
                        onClose={() => setShowCamera(false)}
                    />
                </div>
            )}

            {/* Header / Top Bar */}
            <div className="bg-white p-4 border-b flex flex-col md:flex-row gap-4 items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center w-full md:w-auto gap-4">
                    <button onClick={() => router.push('/dashboard')} className="p-2 border rounded-full text-gray-700 bg-gray-50 hover:bg-gray-200 transition shadow-sm">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-black">{periodName}</h1>
                        <p className="text-xs text-gray-600">Mode Scanning (v1.2)</p>
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
                    <div className="px-3 py-1 bg-purple-100 rounded text-center min-w-[60px]">
                        <div className="text-[10px] font-bold text-purple-800">EXCLUDE</div>
                        <div className="font-bold text-lg text-purple-900">{excludeCount}</div>
                    </div>
                </div>

                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={openExcludeModal}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition"
                    >
                        <UserX size={18} /> Exclude Customer
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition"
                    >
                        <Download size={18} /> Excel
                    </button>
                    <button
                        onClick={() => router.push(`/so/approval/${sessionId}`)}
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
                        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            className="w-full p-3 pl-10 border-2 border-blue-200 rounded-lg text-lg font-mono text-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition outline-none placeholder-gray-600"
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
                        ref={virtuosoRef}
                        style={{ height: 'calc(100vh - 250px)' }}
                        data={processedItems}
                        components={VirtuosoComponents}
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
                        ref={mobileVirtuosoRef}
                        style={{ height: 'calc(100vh - 250px)' }}
                        data={processedItems}
                        itemContent={(index, item) => (
                            <ScannerCard key={item.id} item={item} onUpdate={handleUpdateItem} />
                        )}
                    />
                </div>
            </div>
            {/* Exclude Customer Modal */}
            {showExcludeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExcludeModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <UserX className="text-purple-600" size={20} />
                                    Exclude Customer dari SO
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Pilih customer yang tidak perlu di-SO</p>
                            </div>
                            <button onClick={() => setShowExcludeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XIcon size={18} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 border-b">
                            <input
                                type="text"
                                placeholder="Cari nama customer..."
                                value={excludeSearch}
                                onChange={e => setExcludeSearch(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {excludeLoading ? (
                                <div className="p-8 text-center text-gray-400">Memuat data customer...</div>
                            ) : (
                                <div className="space-y-1">
                                    {excludeCustomers
                                        .filter(c => !excludeSearch || c.name.toLowerCase().includes(excludeSearch.toLowerCase()))
                                        .map(customer => (
                                            <label
                                                key={customer.name}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${excludeSelected.has(customer.name)
                                                        ? 'bg-purple-50 border border-purple-200'
                                                        : 'hover:bg-gray-50 border border-transparent'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={excludeSelected.has(customer.name)}
                                                    onChange={() => toggleExcludeCustomer(customer.name)}
                                                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-gray-800 truncate">{customer.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {customer.invoiceCount} faktur • {formatCurrencyShort(customer.totalAmount)}
                                                    </div>
                                                </div>
                                                {excludeSelected.has(customer.name) && (
                                                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">EXCLUDE</span>
                                                )}
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                <span className="font-bold text-purple-700">{excludeSelected.size}</span> customer dipilih
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowExcludeModal(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={saveExcludeCustomers}
                                    disabled={excludeSaving}
                                    className="px-5 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition disabled:opacity-50"
                                >
                                    {excludeSaving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
