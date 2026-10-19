"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Send, Settings, History, X, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { TableVirtuoso } from "react-virtuoso";

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
                    {!isStaff && (
                        <button
                            onClick={() => router.push('/piutang/settings')}
                            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center gap-2"
                        >
                            <Settings size={16} /> Settings
                        </button>
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
                            itemContent={(index, c) => (
                                <>
                                    <td className="p-4 font-bold text-gray-800" style={{ width: 300 }}>
                                        {c.name}
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
                                    <td className="p-4 text-right font-mono font-bold text-red-600" style={{ width: 180 }}>
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(c.totalOwing)}
                                    </td>
                                    <td className="p-4 text-right" style={{ width: 100 }}>
                                        <button
                                            onClick={() => handleShowDetail(c)}
                                            className="text-blue-600 hover:underline text-xs font-bold"
                                        >
                                            Detail
                                        </button>
                                    </td>
                                </>
                            )}
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
        </div>
    );
}
