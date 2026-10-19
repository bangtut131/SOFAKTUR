"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Send, Settings, History, X, Phone, Ban, CheckCircle, FileDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { TableVirtuoso } from "react-virtuoso";
import * as XLSX from "xlsx";

interface Branch { id: string; name: string }

const PIUTANG_COLUMNS = [
    { key: 'customer', label: 'Customer', width: 300 },
    { key: 'phone', label: 'Kontak', width: 150 },
    { key: 'invoiceCount', label: 'Jml Invoice', width: 120, align: 'center' },
    { key: 'totalOwing', label: 'Total Tagihan', width: 180, align: 'right' },
    { key: 'action', label: 'Action', width: 100, align: 'right' }
];

interface CustomerData {
    id: string;
    name: string;
    phone?: string;
    invoiceCount: number;
    totalOwing: number;
    invoices: any[];
}

export default function PiutangPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);
    const [progress, setProgress] = useState({ current: 0, message: '' });

    // Branches
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');

    // Detail modal state
    const [showDetail, setShowDetail] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);

    // Blacklist state
    const [blacklistedIds, setBlacklistedIds] = useState<Set<string>>(new Set());

    // Modal: Blacklist confirmation
    const [showBlacklistModal, setShowBlacklistModal] = useState(false);
    const [blacklistTarget, setBlacklistTarget] = useState<CustomerData | null>(null);
    const [blacklistReason, setBlacklistReason] = useState('');
    const [blacklistLoading, setBlacklistLoading] = useState(false);

    // Fetch branches
    useEffect(() => {
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

    // Load Data when Branch Changes
    useEffect(() => {
        fetchStoredData();
        fetchBlacklist();
    }, [selectedBranch]);

    const fetchStoredData = async () => {
        try {
            const query = selectedBranch ? `?branchId=${selectedBranch}` : '';
            const res = await fetch(`/api/piutang${query}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setCustomers(data.customers || []);
                if (data.lastUpdate) {
                    setLastUpdate(new Date(data.lastUpdate).toLocaleString('id-ID'));
                }
            }
        } catch (error) {
            console.error("Failed to load stored piutang data", error);
        }
    };

    const fetchBlacklist = async () => {
        try {
            const res = await fetch('/api/piutang/blacklist?activeOnly=true');
            if (res.ok) {
                const data = await res.json();
                setBlacklistedIds(new Set(data.activeIds || []));
            }
        } catch (e) { console.error("Failed to load blacklist", e); }
    };

    const fetchFromAccurate = async () => {
        setLoading(true);
        setProgress({ current: 0, message: 'Sinkronisasi data dengan Accurate...' });

        try {
            const res = await fetch('/api/piutang/fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branchId: selectedBranch || null })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch');
            }

            const data = await res.json();
            // Update state with new data returned from sync
            setStats(data.stats);
            setCustomers(data.customers || []);
            setLastUpdate(new Date().toLocaleString('id-ID')); // Updates immediately
            setProgress({ current: data.stats?.totalInvoices || 0, message: 'Selesai!' });

        } catch (error: any) {
            console.error(error);
            setProgress({ current: 0, message: `Error: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetail = (customer: CustomerData) => {
        setSelectedCustomer(customer);
        setShowDetail(true);
    };

    // Role check
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };
        const role = getCookie('user_role');
        setIsStaff(role === 'STAFF');
    }, []);

    const handleBroadcast = async () => {
        router.push('/broadcast');
    };

    const handleExportExcel = () => {
        if (!customers || customers.length === 0) return;

        const wb = XLSX.utils.book_new();
        const now = new Date();
        const tanggal = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        // ── Sheet 1: Ringkasan per Customer ──
        const ringkasanData = customers.map((c, idx) => ({
            'No': idx + 1,
            'Nama Customer': c.name,
            'No HP': c.phone || '-',
            'Jumlah Invoice': c.invoices?.length || 0,
            'Total Tagihan (Rp)': c.totalOwing,
            'Status Broadcast': blacklistedIds.has(c.id) ? 'Exclude Broadcast' : 'Aktif',
        }));
        const ws1 = XLSX.utils.json_to_sheet(ringkasanData);
        ws1['!cols'] = [
            { wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');

        // ── Sheet 2: Detail per Invoice ──
        const detailData: any[] = [];
        customers.forEach(c => {
            (c.invoices || []).forEach((inv: any) => {
                const age = Math.floor((now.getTime() - new Date(inv.transDate).getTime()) / (1000 * 60 * 60 * 24));
                const overdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                detailData.push({
                    'Nama Customer': c.name,
                    'No HP': c.phone || '-',
                    'No Invoice': inv.transNo,
                    'Tgl Transaksi': new Date(inv.transDate).toLocaleDateString('id-ID'),
                    'Jatuh Tempo': new Date(inv.dueDate).toLocaleDateString('id-ID'),
                    'Umur (Hari)': age,
                    'Overdue (Hari)': overdue > 0 ? overdue : 0,
                    'Status': overdue > 0 ? 'Overdue' : 'Belum Jatuh Tempo',
                    'Outstanding (Rp)': inv.outstanding,
                });
            });
        });
        const ws2 = XLSX.utils.json_to_sheet(detailData);
        ws2['!cols'] = [
            { wch: 35 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
            { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, ws2, 'Detail Invoice');

        const filename = `Piutang_${tanggal.replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    const handleOpenBlacklistModal = (c: CustomerData) => {
        setBlacklistTarget(c);
        setBlacklistReason('');
        setShowBlacklistModal(true);
    };

    const handleAddBlacklist = async () => {
        if (!blacklistTarget) return;
        setBlacklistLoading(true);
        try {
            const res = await fetch('/api/piutang/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: blacklistTarget.id, reason: blacklistReason || null })
            });
            if (res.ok) {
                setShowBlacklistModal(false);
                setBlacklistTarget(null);
                fetchBlacklist();
            }
        } catch (e) { console.error(e); } finally {
            setBlacklistLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 shadow-sm border-b shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => router.push('/dashboard')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Dashboard Piutang</h1>
                        <p className="text-sm text-gray-500">
                            {lastUpdate ? `Last Update: ${lastUpdate}` : 'Data live dari Accurate Online'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button
                        onClick={() => router.push('/piutang/logs')}
                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center gap-2"
                    >
                        <History size={16} /> History
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={customers.length === 0}
                        className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-100 flex items-center gap-2 disabled:opacity-40"
                    >
                        <FileDown size={16} /> Export Excel
                    </button>
                    {!isStaff && (
                        <>
                            <button
                                onClick={() => router.push('/piutang/blacklist')}
                                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-100 flex items-center gap-2"
                            >
                                <Ban size={16} /> Blacklist
                                {blacklistedIds.size > 0 && (
                                    <span className="bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">{blacklistedIds.size}</span>
                                )}
                            </button>
                            <button
                                onClick={() => router.push('/piutang/settings')}
                                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center gap-2"
                            >
                                <Settings size={16} /> Settings
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className="flex-1 p-6 overflow-auto">
                {/* Filter & Fetch */}
                <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Filter Cabang</label>
                            <select
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-medium"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                disabled={loading}
                            >
                                <option value="">- Semua Cabang -</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchFromAccurate}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow disabled:opacity-50"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Sinkronisasi...' : 'Sync Data Accurate'}
                        </button>
                        <button
                            onClick={handleBroadcast}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold"
                        >
                            <Send size={20} />
                            Kirim Broadcast WA
                        </button>
                    </div>
                    {loading && (
                        <div className="mt-4 text-center text-blue-600 font-medium">
                            {progress.message} {progress.current > 0 && `(${progress.current} faktur)`}
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
                            <div className="text-xs font-bold text-gray-500 uppercase">Total Outstanding</div>
                            <div className="text-2xl font-bold text-blue-600 mt-1">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats.totalOutstanding)}
                            </div>
                        </div>
                        <div className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
                            <div className="text-xs font-bold text-gray-500 uppercase">Total Pelanggan</div>
                            <div className="text-2xl font-bold text-green-600 mt-1">{stats.totalCustomers}</div>
                        </div>
                        <div className="bg-white border border-orange-100 rounded-xl p-5 shadow-sm">
                            <div className="text-xs font-bold text-gray-500 uppercase">Total Invoice</div>
                            <div className="text-2xl font-bold text-orange-600 mt-1">{stats.totalInvoices}</div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden h-full flex flex-col">
                    <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 shrink-0">Daftar Piutang Customer</div>
                    <div className="flex-1">
                        <TableVirtuoso
                            style={{ height: '500px' }}
                            data={customers}
                            components={{
                                Table: (props) => (
                                    <table {...props} className="w-full border-collapse table-fixed" style={{ ...props.style, minWidth: 850 }}>
                                        <colgroup>
                                            {PIUTANG_COLUMNS.map((col, idx) => (
                                                <col key={idx} style={{ width: col.width }} />
                                            ))}
                                        </colgroup>
                                        {props.children}
                                    </table>
                                )
                            }}
                            fixedHeaderContent={() => (
                                <tr className="bg-gray-100 text-gray-600 border-b">
                                    {PIUTANG_COLUMNS.map((col, idx) => (
                                        <th
                                            key={idx}
                                            style={{ width: col.width }}
                                            className={`p-4 bg-gray-100 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            )}
                            itemContent={(index, c) => {
                                const isBlacklisted = blacklistedIds.has(c.id);
                                return (
                                    <>
                                        <td className={`p-4 font-bold ${isBlacklisted ? 'text-gray-400' : 'text-gray-800'}`} style={{ width: 300 }}>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {c.name}
                                                {isBlacklisted && (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                                        <Ban size={10} /> Exclude Broadcast
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 font-normal lg:hidden">{c.phone || '-'}</div>
                                        </td>
                                        <td className="p-4 text-gray-600 hidden lg:table-cell" style={{ width: 150 }}>
                                            {c.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <Phone size={14} className="text-green-600" />
                                                    {c.phone}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4 text-center font-mono" style={{ width: 120 }}>{c.invoices?.length || 0}</td>
                                        <td className={`p-4 text-right font-mono font-bold ${isBlacklisted ? 'text-gray-400' : 'text-red-600'}`} style={{ width: 180 }}>
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(c.totalOwing)}
                                        </td>
                                        <td className="p-4 text-right" style={{ width: 100 }}>
                                            <div className="flex flex-col items-end gap-1">
                                                <button
                                                    onClick={() => handleShowDetail(c)}
                                                    className="text-blue-600 hover:underline text-xs font-bold"
                                                >
                                                    Detail
                                                </button>
                                                {!isStaff && !isBlacklisted && (
                                                    <button
                                                        onClick={() => handleOpenBlacklistModal(c)}
                                                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                                                    >
                                                        <Ban size={11} /> Blacklist
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </>
                                );
                            }}
                        />
                    </div>
                </div>
            </main>

            {/* Detail Modal */}
            {showDetail && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">{selectedCustomer.name}</h2>
                                {selectedCustomer.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Phone size={14} /> {selectedCustomer.phone}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => { setShowDetail(false); setSelectedCustomer(null); }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            <div className="mb-4 p-3 bg-gray-100 rounded-lg border">
                                <div className="text-sm text-gray-700 font-medium">Total Tagihan</div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(selectedCustomer.totalOwing)}
                                </div>
                            </div>

                            <div className="text-sm font-bold text-gray-800 mb-2">Daftar Invoice ({selectedCustomer.invoices?.length || 0})</div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="p-2 text-left text-gray-800">No. Invoice</th>
                                        <th className="p-2 text-center text-gray-800">Tgl Trans</th>
                                        <th className="p-2 text-center text-gray-800">Jatuh Tempo</th>
                                        <th className="p-2 text-center text-gray-800">Umur</th>
                                        <th className="p-2 text-center text-gray-800">Overdue</th>
                                        <th className="p-2 text-right text-gray-800">Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedCustomer.invoices?.map((r: any, idx: number) => {
                                        const age = Math.floor((new Date().getTime() - new Date(r.transDate).getTime()) / (1000 * 60 * 60 * 24));
                                        const overdue = Math.floor((new Date().getTime() - new Date(r.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-2 font-mono text-xs text-gray-800">{r.transNo}</td>
                                                <td className="p-2 text-center text-xs text-gray-700">{new Date(r.transDate).toLocaleDateString('id-ID')}</td>
                                                <td className="p-2 text-center text-xs text-gray-700">{new Date(r.dueDate).toLocaleDateString('id-ID')}</td>
                                                <td className="p-2 text-center text-xs text-gray-700">{age} Hari</td>
                                                <td className={`p-2 text-center text-xs font-bold ${overdue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {overdue > 0 ? `${overdue} Hari` : 'Belum'}
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold text-red-700">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(r.outstanding)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal: Blacklist Confirmation */}
            {showBlacklistModal && blacklistTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b flex items-center gap-2">
                            <Ban className="text-red-600" size={20} />
                            <h2 className="text-lg font-bold text-gray-800">Blacklist Customer</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-gray-700">
                                Tambahkan <strong>{blacklistTarget.name}</strong> ke daftar blacklist?
                                Customer ini tidak akan menerima broadcast WhatsApp meskipun punya piutang aktif.
                            </p>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Alasan <span className="font-normal text-gray-400">(opsional)</span></label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm"
                                    rows={3}
                                    placeholder="Contoh: Piutang dalam sengketa, Sudah lunas di luar sistem..."
                                    value={blacklistReason}
                                    onChange={e => setBlacklistReason(e.target.value)}
                                />
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                                ⚠️ Untuk mengembalikan, buka menu <strong>Blacklist</strong> dan klik <strong>Whitelist</strong>.
                            </div>
                        </div>
                        <div className="p-4 border-t flex gap-2 justify-end">
                            <button onClick={() => { setShowBlacklistModal(false); setBlacklistTarget(null); }} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-100 font-medium text-sm">Batal</button>
                            <button
                                onClick={handleAddBlacklist}
                                disabled={blacklistLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <Ban size={14} /> {blacklistLoading ? 'Menyimpan...' : 'Blacklist Sekarang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
