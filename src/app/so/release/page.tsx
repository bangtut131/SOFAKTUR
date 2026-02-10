"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Filter, RefreshCw, FileText } from "lucide-react";

export default function ReleaseSOPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [periodName, setPeriodName] = useState("");
    const [progress, setProgress] = useState({ current: 0, status: '' });
    const [isReleasing, setIsReleasing] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        owingStatus: 'UNPAID',
        fromDate: '',
        toDate: '',
        accurateStatus: '',
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

    const handleRelease = async () => {
        if (!periodName) {
            alert("Harap isi Nama Periode SO!");
            return;
        }

        if (!confirm("Apakah Anda yakin ingin melepas data ini untuk SO? Data akan dikunci.")) return;

        setLoading(true);
        setIsReleasing(true);
        setProgress({ current: 0, status: 'Membuat Sesi...' });

        try {
            // 1. Init Session
            const initRes = await fetch('/api/so/release/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodName })
            });
            const initData = await initRes.json();
            if (!initRes.ok) throw new Error(initData.error);

            const sessionId = initData.sessionId;
            let page = 1;
            let hasMore = true;
            let totalFetched = 0;
            const MAX_PAGES = 500;
            const PAGES_PER_BATCH = 5; // Server fetches 5 pages in parallel per call

            // 2. Loop Batches (server fetches multiple pages per call)
            while (hasMore && page <= MAX_PAGES) {
                setProgress({ current: totalFetched, status: `Menarik data halaman ${page}-${page + PAGES_PER_BATCH - 1}...` });

                const batchRes = await fetch('/api/so/release/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, filters, page, pagesPerBatch: PAGES_PER_BATCH })
                });

                const batchData = await batchRes.json();
                if (!batchRes.ok) throw new Error(batchData.error);

                totalFetched += batchData.count;
                hasMore = batchData.hasMore;
                page += PAGES_PER_BATCH;

                await new Promise(r => setTimeout(r, 100));
            }

            setProgress({ current: totalFetched, status: 'Selesai!' });
            alert(`Berhasil Release SO! \nTotal Faktur: ${totalFetched}`);
            router.push('/dashboard');

        } catch (error: any) {
            console.error(error);
            alert(`Gagal: ${error.message}`);
        } finally {
            setLoading(false);
            setIsReleasing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.push('/dashboard')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Setup Periode SO Baru</h1>
                        <p className="text-gray-500">Tarik data dari Accurate untuk memulai periode Stock Opname baru.</p>
                    </div>
                </header>

                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
                    {/* Period Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nama Periode / Sesi</label>
                        <input
                            type="text"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 placeholder-gray-500"
                            placeholder="Contoh: SO Minggu 4 Januari 2026"
                            value={periodName}
                            onChange={(e) => setPeriodName(e.target.value)}
                            disabled={isReleasing}
                        />
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex items-center gap-2 text-gray-800 font-bold mb-4">
                            <Filter size={20} className="text-blue-600" />
                            <span>Filter Data Accurate</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Status Piutang</label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 font-medium text-gray-900"
                                    value={filters.owingStatus}
                                    onChange={(e) => setFilters(prev => ({ ...prev, owingStatus: e.target.value as any }))}
                                    disabled={isReleasing}
                                >
                                    <option value="UNPAID">Belum Lunas (Outstanding)</option>
                                    <option value="PAID">Lunas</option>
                                    <option value="ALL">Semua</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Status Accurate (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Dihapus"
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500"
                                    value={filters.accurateStatus}
                                    onChange={(e) => setFilters(prev => ({ ...prev, accurateStatus: e.target.value }))}
                                    disabled={isReleasing}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">Filter Cabang (Optional)</label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-medium"
                                    value={filters.branchId}
                                    onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
                                    disabled={isReleasing}
                                >
                                    <option value="">- Semua Cabang -</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Dari Tanggal</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                                        value={filters.fromDate}
                                        onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                                        disabled={isReleasing}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                                        value={filters.toDate}
                                        onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                                        disabled={isReleasing}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    {isReleasing && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-center space-y-2">
                            <RefreshCw className="animate-spin mx-auto text-blue-600" size={32} />
                            <h3 className="font-bold text-blue-900 text-lg">{progress.status}</h3>
                            <p className="text-blue-700 font-mono text-2xl font-bold">{progress.current} Faktur</p>
                            <p className="text-xs text-blue-500">Mohon jangan tutup halaman ini...</p>
                        </div>
                    )}

                    <div className="pt-6 border-t flex justify-end">
                        {!isReleasing && (
                            <button
                                onClick={handleRelease}
                                disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transform transition active:scale-95 disabled:opacity-50"
                            >
                                <Save />
                                Release Data SO
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
                    <FileText className="shrink-0" />
                    <p>
                        <strong>Catatan:</strong> Setelah data direlease, sistem akan menyimpan salinan faktur ke database lokal. Perubahan data di Accurate setelah ini tidak akan mengubah data SO yang sedang berjalan.
                    </p>
                </div>
            </div>
        </div>
    );
}
