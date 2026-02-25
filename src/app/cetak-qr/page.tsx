"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, QrCode, Filter, RefreshCw, Download, FileText, UserX, Check } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

// Layout configs for A4 (210x297mm)
const LAYOUTS = {
    SEDANG: {
        label: 'Sedang (50×25mm)',
        stickerW: 50,
        stickerH: 25,
        cols: 3,
        rows: 10,
        qrSize: 18,
        fontSize: 6,
        fontSizeCust: 5,
        marginX: 15, // (210 - 3*50) / 2 = 30 / 2
        marginY: 11, // (297 - 10*25) / 2 = 47 / 2 ~= 23
        paddingX: 10,
        paddingY: 2.5,
        perPage: 30
    },
    BESAR: {
        label: 'Besar (100×50mm)',
        stickerW: 90,
        stickerH: 50,
        cols: 2,
        rows: 5,
        qrSize: 35,
        fontSize: 9,
        fontSizeCust: 7,
        marginX: 15,
        marginY: 11,
        paddingX: 5,
        paddingY: 3,
        perPage: 10
    }
};

type LayoutKey = keyof typeof LAYOUTS;

interface SoSession {
    id: string;
    periodName: string;
    createdAt: string;
    totalItems: number;
}

interface SoItemQR {
    id: string;
    transNo: string;
    transDate: string;
    customerName: string;
}

export default function CetakQRPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<SoSession[]>([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [items, setItems] = useState<SoItemQR[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [layout, setLayout] = useState<LayoutKey>('SEDANG');

    // Filter
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [excludedCustomers, setExcludedCustomers] = useState<Set<string>>(new Set());

    // Derived: unique customers + filtered items
    const uniqueCustomers = useMemo(() => {
        const names = new Set(items.map(i => i.customerName));
        return Array.from(names).sort();
    }, [items]);

    const filteredItems = useMemo(() => {
        if (excludedCustomers.size === 0) return items;
        return items.filter(i => !excludedCustomers.has(i.customerName));
    }, [items, excludedCustomers]);

    const toggleExclude = (name: string) => {
        setExcludedCustomers(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const toggleExcludeAll = () => {
        if (excludedCustomers.size === uniqueCustomers.length) {
            setExcludedCustomers(new Set());
        } else {
            setExcludedCustomers(new Set(uniqueCustomers));
        }
    };

    useEffect(() => {
        // Fetch sessions
        const fetchSessions = async () => {
            try {
                const res = await fetch('/api/so/sessions');
                if (res.ok) {
                    const data = await res.json();
                    setSessions(data);
                    // Auto-select the latest session
                    if (data.length > 0) {
                        setSelectedSession(data[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to load sessions", error);
            }
        };
        fetchSessions();
    }, []);

    const fetchItems = async () => {
        if (!selectedSession) {
            alert("Pilih sesi SO terlebih dahulu!");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/cetak-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedSession,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setItems(data.items || []);
            setExcludedCustomers(new Set()); // Reset exclude on new fetch
        } catch (error: any) {
            alert(`Gagal: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = async () => {
        if (filteredItems.length === 0) {
            alert("Tidak ada data untuk dicetak! (semua customer di-exclude?)");
            return;
        }

        setGenerating(true);

        try {
            const cfg = LAYOUTS[layout];
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const printItems = filteredItems;

            for (let i = 0; i < printItems.length; i++) {
                const item = printItems[i];
                const pageIndex = Math.floor(i / cfg.perPage);
                const posInPage = i % cfg.perPage;
                const col = posInPage % cfg.cols;
                const row = Math.floor(posInPage / cfg.cols);

                // Add new page if needed (not for first item)
                if (posInPage === 0 && i > 0) {
                    doc.addPage();
                }

                // Calculate position
                const x = cfg.marginX + col * (cfg.stickerW + cfg.paddingX);
                const y = cfg.marginY + row * (cfg.stickerH + cfg.paddingY);

                // Generate QR code as data URL
                const qrDataUrl = await QRCode.toDataURL(item.transNo, {
                    width: 200,
                    margin: 1,
                    errorCorrectionLevel: 'M'
                });

                // Draw sticker border (light gray dashed)
                doc.setDrawColor(200, 200, 200);
                doc.setLineDashPattern([1, 1], 0);
                doc.rect(x, y, cfg.stickerW, cfg.stickerH);
                doc.setLineDashPattern([], 0);

                // QR Code - centered horizontally
                const qrX = x + (cfg.stickerW - cfg.qrSize) / 2;
                const qrY = y + 2;
                doc.addImage(qrDataUrl, 'PNG', qrX, qrY, cfg.qrSize, cfg.qrSize);

                // Invoice number - centered below QR
                doc.setFontSize(cfg.fontSize);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                const textY = qrY + cfg.qrSize + 3;
                doc.text(item.transNo, x + cfg.stickerW / 2, textY, { align: 'center' });

                // Customer name - centered below invoice no
                doc.setFontSize(cfg.fontSizeCust);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                const custY = textY + cfg.fontSizeCust * 0.5 + 1;
                // Truncate customer name if too long
                let custName = item.customerName;
                const maxChars = layout === 'SEDANG' ? 18 : 30;
                if (custName.length > maxChars) {
                    custName = custName.substring(0, maxChars - 2) + '..';
                }
                doc.text(custName, x + cfg.stickerW / 2, custY, { align: 'center' });
            }

            // Save PDF
            const sessionName = sessions.find(s => s.id === selectedSession)?.periodName || 'QR';
            doc.save(`Sticker_QR_${sessionName}_${layout}.pdf`);
        } catch (error: any) {
            console.error(error);
            alert(`Gagal membuat PDF: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const cfg = LAYOUTS[layout];
    const totalPages = filteredItems.length > 0 ? Math.ceil(filteredItems.length / cfg.perPage) : 0;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.push('/dashboard')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <QrCode className="text-purple-500" />
                            Cetak Sticker QR Code
                        </h1>
                        <p className="text-gray-500">Generate PDF sticker label QR code dari data faktur SO.</p>
                    </div>
                </header>

                {/* Settings Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-5">
                    <div className="flex items-center gap-2 text-gray-800 font-bold">
                        <Filter size={20} className="text-blue-600" />
                        <span>Pengaturan</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Session Selector */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Pilih Sesi SO</label>
                            <select
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-medium"
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(e.target.value)}
                                disabled={loading || generating}
                            >
                                <option value="">- Pilih Sesi -</option>
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.periodName} ({s.totalItems} faktur)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Dari Tanggal (Optional)</label>
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                disabled={loading || generating}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Sampai Tanggal (Optional)</label>
                            <input
                                type="date"
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                disabled={loading || generating}
                            />
                        </div>

                        {/* Size Selector */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-600 mb-2 block">Ukuran Sticker</label>
                            <div className="flex gap-3">
                                {(Object.keys(LAYOUTS) as LayoutKey[]).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setLayout(key)}
                                        disabled={loading || generating}
                                        className={`flex-1 p-4 rounded-lg border-2 text-center transition font-medium ${layout === key
                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-bold text-sm">{LAYOUTS[key].label}</div>
                                        <div className="text-xs mt-1 opacity-70">{LAYOUTS[key].perPage} sticker / halaman</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fetch Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={fetchItems}
                            disabled={loading || !selectedSession}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow transition active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
                            Muat Data Faktur
                        </button>
                    </div>
                </div>

                {/* Exclude Customer */}
                {items.length > 0 && uniqueCustomers.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-gray-800 font-bold">
                                <UserX size={20} className="text-orange-500" />
                                <span>Exclude Customer</span>
                                <span className="text-xs font-normal text-gray-500 ml-1">
                                    ({excludedCustomers.size} dari {uniqueCustomers.length} di-exclude)
                                </span>
                            </div>
                            <button
                                onClick={toggleExcludeAll}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                            >
                                {excludedCustomers.size === uniqueCustomers.length ? 'Hapus Semua' : 'Exclude Semua'}
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-gray-100">
                            {uniqueCustomers.map(name => {
                                const isExcluded = excludedCustomers.has(name);
                                const count = items.filter(i => i.customerName === name).length;
                                return (
                                    <label
                                        key={name}
                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition text-sm ${isExcluded ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isExcluded}
                                            onChange={() => toggleExclude(name)}
                                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                        />
                                        <span className={`flex-1 ${isExcluded ? 'line-through' : 'font-medium'}`}>{name}</span>
                                        <span className="text-xs text-gray-400">{count} faktur</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Preview & Generate */}
                {items.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">Preview</h3>
                                <p className="text-sm text-gray-500">
                                    {filteredItems.length} faktur{excludedCustomers.size > 0 ? ` (${items.length - filteredItems.length} di-exclude)` : ''} • {totalPages} halaman • Ukuran: {cfg.label}
                                </p>
                            </div>
                            <button
                                onClick={generatePDF}
                                disabled={generating || filteredItems.length === 0}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
                            >
                                {generating ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                                {generating ? 'Generating...' : 'Generate PDF'}
                            </button>
                        </div>

                        {/* Sample list */}
                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr className="text-xs text-gray-500 uppercase">
                                        <th className="p-3 text-left font-semibold">#</th>
                                        <th className="p-3 text-left font-semibold">No. Faktur</th>
                                        <th className="p-3 text-left font-semibold">Tanggal</th>
                                        <th className="p-3 text-left font-semibold">Pelanggan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredItems.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-3 text-gray-400">{idx + 1}</td>
                                            <td className="p-3 font-medium text-gray-900">{item.transNo}</td>
                                            <td className="p-3 text-gray-600">{item.transDate}</td>
                                            <td className="p-3 text-gray-600">{item.customerName}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
