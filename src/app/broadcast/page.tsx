"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Send, Users, FileText, Radio, History,
    CheckCircle, XCircle, AlertCircle, RefreshCw,
    Plus, Trash2, Search, Phone, Check, X, Pause, Play, Smartphone
} from "lucide-react";

interface Recipient {
    id: string;
    name: string;
    phone: string;
    totalOwing: number;
    invoiceCount: number;
    invoices: any[];
    selected: boolean;
    waStatus: 'unchecked' | 'valid' | 'invalid' | 'unknown';
    isManual?: boolean;
}

interface SendResult {
    index: number;
    name: string;
    phone: string;
    status: 'SENT' | 'FAILED' | 'PENDING';
    error?: string;
    sent: number;
    failed: number;
    total: number;
}

const DEFAULT_TEMPLATE = `Halo {customerName},

Anda memiliki tagihan sebesar {totalOwing}. Mohon segera dilunasi.

Detail:
{invoiceList}

Terima kasih.`;

const TABS = [
    { key: 'recipients', label: 'Penerima', icon: Users },
    { key: 'template', label: 'Template', icon: FileText },
    { key: 'send', label: 'Kirim', icon: Radio },
    { key: 'history', label: 'Riwayat', icon: History },
];

export default function BroadcastPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('recipients');

    // Recipients State
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [waFilter, setWaFilter] = useState('all'); // all, valid, invalid, unchecked, nophone
    const [checkingContacts, setCheckingContacts] = useState(false);

    // Manual Add
    const [showAddManual, setShowAddManual] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualPhone, setManualPhone] = useState('');

    // Template State
    const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    // Send State
    const [sending, setSending] = useState(false);
    const [sendResults, setSendResults] = useState<SendResult[]>([]);
    const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });
    const [sendDone, setSendDone] = useState(false);
    const [delaySeconds, setDelaySeconds] = useState(5);
    const abortRef = useRef<AbortController | null>(null);

    // History State
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [historyStats, setHistoryStats] = useState<any>({});
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Device State
    const [devices, setDevices] = useState<any[]>([]);
    const [selectedDevices, setSelectedDevices] = useState<string[]>([]); // session IDs
    const [useWahaDefault, setUseWahaDefault] = useState(true);

    useEffect(() => {
        fetchRecipients();
        loadTemplate();
        fetchDevices();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') fetchHistory();
    }, [activeTab]);

    const fetchRecipients = async () => {
        setLoadingRecipients(true);
        try {
            const res = await fetch('/api/broadcast/recipients');
            const data = await res.json();
            if (data.success) {
                setRecipients(data.recipients.map((r: any) => ({
                    ...r,
                    selected: !!r.phone,
                    waStatus: 'unchecked' as const,
                })));
            }
        } catch (e) {
            console.error('Failed to fetch recipients', e);
        } finally {
            setLoadingRecipients(false);
        }
    };

    const loadTemplate = async () => {
        setLoadingTemplate(true);
        try {
            const res = await fetch('/api/piutang/settings');
            const data = await res.json();
            const broadcast = (data.schedules || []).find((s: any) => s.type === 'BROADCAST');
            if (broadcast?.messageTemplate) {
                setTemplate(broadcast.messageTemplate);
            }
        } catch (e) {
            console.error('Failed to load template', e);
        } finally {
            setLoadingTemplate(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/broadcast/history?limit=200');
            const data = await res.json();
            if (data.success) {
                setHistoryLogs(data.logs);
                setHistoryStats(data.stats);
            }
        } catch (e) {
            console.error('Failed to fetch history', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/broadcast/devices');
            const data = await res.json();
            if (data.success) setDevices(data.devices || []);
        } catch (e) { console.error('Failed to fetch devices', e); }
    };

    const toggleDeviceSelect = (sessionId: string) => {
        setSelectedDevices(prev =>
            prev.includes(sessionId) ? prev.filter(s => s !== sessionId) : [...prev, sessionId]
        );
    };

    // Check WA Contacts
    const handleCheckContacts = async () => {
        const phonesToCheck = recipients.filter(r => r.phone && r.waStatus === 'unchecked').map(r => r.phone);
        if (phonesToCheck.length === 0) {
            alert('Tidak ada kontak yang perlu dicek.');
            return;
        }
        setCheckingContacts(true);
        try {
            const res = await fetch('/api/broadcast/check-contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones: phonesToCheck }),
            });
            const data = await res.json();
            if (data.success && data.results) {
                const resultMap = new Map(data.results.map((r: any) => [r.phone, r.exists]));
                setRecipients(prev => prev.map(r => {
                    if (r.phone && resultMap.has(r.phone)) {
                        const exists = resultMap.get(r.phone);
                        return { ...r, waStatus: exists === true ? 'valid' : exists === false ? 'invalid' : 'unknown' };
                    }
                    return r;
                }));
            }
        } catch (e) {
            alert('Gagal cek kontak: ' + (e as any).message);
        } finally {
            setCheckingContacts(false);
        }
    };

    // Select helpers
    const selectedRecipients = useMemo(() => recipients.filter(r => r.selected), [recipients]);

    const filteredRecipients = useMemo(() => {
        let list = recipients;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(r => r.name.toLowerCase().includes(q) || r.phone?.includes(q));
        }
        if (waFilter === 'valid') list = list.filter(r => r.waStatus === 'valid');
        else if (waFilter === 'invalid') list = list.filter(r => r.waStatus === 'invalid');
        else if (waFilter === 'unchecked') list = list.filter(r => r.waStatus === 'unchecked');
        else if (waFilter === 'nophone') list = list.filter(r => !r.phone);
        return list;
    }, [recipients, searchQuery, waFilter]);

    const toggleSelectAll = (checked: boolean) => {
        const filteredIds = new Set(filteredRecipients.map(r => r.id));
        setRecipients(prev => prev.map(r => filteredIds.has(r.id) ? { ...r, selected: checked } : r));
    };

    const toggleSelect = (id: string) => {
        setRecipients(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    };

    // Add Manual Recipient
    const handleAddManual = () => {
        if (!manualName.trim() || !manualPhone.trim()) {
            alert('Nama dan Nomor HP wajib diisi');
            return;
        }
        const newRecipient: Recipient = {
            id: `manual-${Date.now()}`,
            name: manualName.trim(),
            phone: manualPhone.trim(),
            totalOwing: 0,
            invoiceCount: 0,
            invoices: [],
            selected: true,
            waStatus: 'unchecked',
            isManual: true,
        };
        setRecipients(prev => [newRecipient, ...prev]);
        setManualName('');
        setManualPhone('');
        setShowAddManual(false);
    };

    const removeManual = (id: string) => {
        setRecipients(prev => prev.filter(r => r.id !== id));
    };

    // Render template preview
    const renderPreview = (r: Recipient) => {
        const totalOwing = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(r.totalOwing || 0);
        const invoiceList = (r.invoices || [])
            .map((inv: any) => `- ${inv.transNo}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.outstanding)}`)
            .join('\n');
        return template
            .replace(/{customerName}/g, r.name)
            .replace(/{totalOwing}/g, totalOwing)
            .replace(/{invoiceList}/g, invoiceList || '(tidak ada invoice)')
            .replace(/{invoiceCount}/g, String(r.invoiceCount || 0));
    };

    // Send broadcast
    const handleSend = async () => {
        const toSend = selectedRecipients.filter(r => r.phone);
        if (toSend.length === 0) {
            alert('Tidak ada penerima dengan nomor HP yang dipilih.');
            return;
        }
        if (!confirm(`Kirim broadcast ke ${toSend.length} penerima?\n\nDelay antar pesan: ${delaySeconds} detik\nEstimasi waktu: ~${Math.ceil(toSend.length * delaySeconds / 60)} menit`)) return;
        if (!confirm('Konfirmasi TERAKHIR: Yakin mulai kirim?')) return;

        setSending(true);
        setSendDone(false);
        setSendResults([]);
        setSendProgress({ sent: 0, failed: 0, total: toSend.length });

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch('/api/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: toSend,
                    template,
                    delay: delaySeconds * 1000,
                    deviceSessionIds: useWahaDefault ? [] : selectedDevices,
                }),
                signal: controller.signal,
            });

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.type === 'RESULT') {
                                    setSendResults(prev => [...prev, data]);
                                    setSendProgress({ sent: data.sent, failed: data.failed, total: data.total });
                                } else if (data.type === 'DONE') {
                                    setSendProgress({ sent: data.sent, failed: data.failed, total: data.total });
                                    setSendDone(true);
                                }
                            } catch (e) { }
                        }
                    }
                }
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                setSendDone(true);
            } else {
                alert('Error: ' + e.message);
            }
        } finally {
            setSending(false);
            abortRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    };

    const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white p-4 shadow-sm border-b shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Send size={20} className="text-green-600" /> Broadcast WhatsApp
                        </h1>
                        <p className="text-xs text-gray-500">Kirim pesan tagihan ke pelanggan</p>
                    </div>
                </div>
                <div className="text-sm text-gray-500">
                    {selectedRecipients.length > 0 && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs">
                            {selectedRecipients.length} dipilih
                        </span>
                    )}
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="bg-white border-b px-4 shrink-0">
                <div className="flex gap-1 max-w-5xl mx-auto">
                    {TABS.map((tab, idx) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition ${isActive ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isActive ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{idx + 1}</span>
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 p-6 overflow-auto">
                <div className="max-w-5xl mx-auto">

                    {/* ========= TAB: RECIPIENTS ========= */}
                    {activeTab === 'recipients' && (
                        <div className="space-y-4">
                            {/* Controls */}
                            <div className="flex flex-wrap gap-3 items-end bg-white p-4 rounded-xl border shadow-sm">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Cari Nama / No HP</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm text-gray-900"
                                            placeholder="Cari..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="min-w-[160px]">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Filter Status WA</label>
                                    <select
                                        className="w-full p-2 border rounded-lg text-sm text-gray-900 font-medium"
                                        value={waFilter}
                                        onChange={(e) => setWaFilter(e.target.value)}
                                    >
                                        <option value="all">Semua</option>
                                        <option value="valid">✅ Ada WA</option>
                                        <option value="invalid">❌ Tidak Ada WA</option>
                                        <option value="unchecked">⏳ Belum Dicek</option>
                                        <option value="nophone">📵 Tanpa Nomor</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleCheckContacts}
                                    disabled={checkingContacts}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                                >
                                    {checkingContacts ? <RefreshCw size={14} className="animate-spin" /> : <Phone size={14} />}
                                    {checkingContacts ? 'Checking...' : 'Cek Kontak WA'}
                                </button>
                                <button
                                    onClick={() => setShowAddManual(!showAddManual)}
                                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                                >
                                    <Plus size={14} /> Tambah Manual
                                </button>
                                <button
                                    onClick={fetchRecipients}
                                    disabled={loadingRecipients}
                                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition"
                                >
                                    <RefreshCw size={14} className={loadingRecipients ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Add Manual Form */}
                            {showAddManual && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Nama</label>
                                        <input type="text" className="w-full p-2 border rounded-lg text-sm text-gray-900" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Nama Penerima" />
                                    </div>
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-xs font-bold text-gray-600 mb-1">No HP (62xxx)</label>
                                        <input type="text" className="w-full p-2 border rounded-lg text-sm text-gray-900" value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="628123..." />
                                    </div>
                                    <button onClick={handleAddManual} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
                                        <Check size={14} />
                                    </button>
                                    <button onClick={() => setShowAddManual(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Summary Badge */}
                            <div className="flex gap-3 text-xs font-bold">
                                <span className="bg-white border rounded-full px-3 py-1 text-gray-600">Total: {recipients.length}</span>
                                <span className="bg-green-50 border border-green-200 rounded-full px-3 py-1 text-green-700">Dipilih: {selectedRecipients.length}</span>
                                <span className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-blue-700">Ada Nomor: {recipients.filter(r => r.phone).length}</span>
                                <span className="bg-red-50 border border-red-200 rounded-full px-3 py-1 text-red-700">Tanpa Nomor: {recipients.filter(r => !r.phone).length}</span>
                            </div>

                            {/* Table */}
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="overflow-x-auto" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3 text-left w-10 bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4"
                                                        checked={filteredRecipients.length > 0 && filteredRecipients.every(r => r.selected)}
                                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                                    />
                                                </th>
                                                <th className="p-3 text-left font-bold text-gray-600 bg-gray-50">Nama Customer</th>
                                                <th className="p-3 text-left font-bold text-gray-600 bg-gray-50">No HP</th>
                                                <th className="p-3 text-center font-bold text-gray-600 bg-gray-50">WA</th>
                                                <th className="p-3 text-right font-bold text-gray-600 bg-gray-50">Total Tagihan</th>
                                                <th className="p-3 text-center font-bold text-gray-600 bg-gray-50">Invoice</th>
                                                <th className="p-3 text-center font-bold text-gray-600 bg-gray-50 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {loadingRecipients ? (
                                                <tr><td colSpan={7} className="p-8 text-center text-gray-500"><RefreshCw size={20} className="animate-spin inline mr-2" />Loading...</td></tr>
                                            ) : filteredRecipients.length === 0 ? (
                                                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Tidak ada data.</td></tr>
                                            ) : filteredRecipients.map(r => (
                                                <tr key={r.id} className={`hover:bg-gray-50 ${r.selected ? 'bg-green-50/40' : ''}`}>
                                                    <td className="p-3">
                                                        <input type="checkbox" className="w-4 h-4" checked={r.selected} onChange={() => toggleSelect(r.id)} />
                                                    </td>
                                                    <td className="p-3 font-bold text-gray-800">
                                                        {r.name}
                                                        {r.isManual && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold">MANUAL</span>}
                                                    </td>
                                                    <td className="p-3 font-mono text-xs text-gray-600">
                                                        {r.phone || <span className="text-red-400 italic">kosong</span>}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {r.waStatus === 'valid' && <CheckCircle size={16} className="text-green-500 inline" />}
                                                        {r.waStatus === 'invalid' && <XCircle size={16} className="text-red-500 inline" />}
                                                        {r.waStatus === 'unknown' && <AlertCircle size={16} className="text-yellow-500 inline" />}
                                                        {r.waStatus === 'unchecked' && <span className="text-gray-300 text-xs">-</span>}
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-red-600 text-xs">{r.totalOwing > 0 ? fmt(r.totalOwing) : '-'}</td>
                                                    <td className="p-3 text-center text-gray-600">{r.invoiceCount || '-'}</td>
                                                    <td className="p-3 text-center">
                                                        {r.isManual && (
                                                            <button onClick={() => removeManual(r.id)} className="text-red-400 hover:text-red-600">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========= TAB: TEMPLATE ========= */}
                    {activeTab === 'template' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Editor */}
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl shadow-sm border p-5">
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <FileText size={16} /> Template Pesan
                                    </h3>
                                    <textarea
                                        className="w-full p-3 border rounded-lg text-sm min-h-[250px] text-gray-900 font-mono"
                                        value={template}
                                        onChange={(e) => setTemplate(e.target.value)}
                                    />
                                    <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <p className="text-xs text-blue-700 font-bold mb-1">Variabel yang tersedia:</p>
                                        <div className="grid grid-cols-2 gap-1 text-xs text-blue-600">
                                            <span><code className="bg-blue-100 px-1 rounded">{'{customerName}'}</code> Nama customer</span>
                                            <span><code className="bg-blue-100 px-1 rounded">{'{totalOwing}'}</code> Total tagihan</span>
                                            <span><code className="bg-blue-100 px-1 rounded">{'{invoiceList}'}</code> Daftar faktur</span>
                                            <span><code className="bg-blue-100 px-1 rounded">{'{invoiceCount}'}</code> Jumlah faktur</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border p-5">
                                    <h3 className="font-bold text-gray-800 mb-3">⏱ Delay Antar Pesan</h3>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range" min="3" max="15" step="1" value={delaySeconds}
                                            onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="bg-gray-100 px-3 py-1 rounded-lg font-bold text-gray-700 text-sm min-w-[60px] text-center">{delaySeconds}s</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Semakin lambat semakin aman. Rekomendasi: 5-8 detik.</p>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl shadow-sm border p-5">
                                    <h3 className="font-bold text-gray-800 mb-3">📱 Preview Pesan</h3>
                                    <div className="bg-[#E4DCD3] p-4 rounded-lg min-h-[300px] relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,0.03) 35px, rgba(0,0,0,0.03) 70px)',
                                        }}></div>
                                        {selectedRecipients.length > 0 ? (
                                            <div className="relative z-10 bg-white p-3 rounded-lg shadow-sm text-sm whitespace-pre-wrap max-w-[90%] rounded-tl-none" style={{ lineHeight: '1.5' }}>
                                                {renderPreview(selectedRecipients[0])}
                                                <span className="text-[10px] text-gray-400 block text-right mt-2">
                                                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-400 text-sm mt-20">
                                                Pilih penerima dulu di tab Penerima untuk melihat preview.
                                            </div>
                                        )}
                                    </div>
                                    {selectedRecipients.length > 0 && (
                                        <p className="text-[10px] text-gray-400 mt-2 italic">
                                            Preview menggunakan data: <strong>{selectedRecipients[0].name}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========= TAB: SEND ========= */}
                    {activeTab === 'send' && (
                        <div className="space-y-4">
                            {/* Summary before send */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Radio size={16} className="text-green-600" /> Ringkasan Pengiriman
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-green-700">{selectedRecipients.filter(r => r.phone).length}</div>
                                        <div className="text-xs text-green-600 font-bold">Siap Kirim</div>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-red-700">{selectedRecipients.filter(r => !r.phone).length}</div>
                                        <div className="text-xs text-red-600 font-bold">Tanpa Nomor</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-blue-700">{delaySeconds}s</div>
                                        <div className="text-xs text-blue-600 font-bold">Delay / Pesan</div>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-purple-700">~{Math.ceil(selectedRecipients.filter(r => r.phone).length * delaySeconds / 60)} min</div>
                                        <div className="text-xs text-purple-600 font-bold">Estimasi Waktu</div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {!sending && !sendDone && (
                                        <button
                                            onClick={handleSend}
                                            disabled={selectedRecipients.filter(r => r.phone).length === 0}
                                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold shadow transition"
                                        >
                                            <Play size={16} /> Mulai Kirim Broadcast
                                        </button>
                                    )}
                                    {sending && (
                                        <button
                                            onClick={handleStop}
                                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow transition"
                                        >
                                            <Pause size={16} /> Stop
                                        </button>
                                    )}
                                    {sendDone && (
                                        <button
                                            onClick={() => { setSendDone(false); setSendResults([]); setSendProgress({ sent: 0, failed: 0, total: 0 }); }}
                                            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold shadow transition"
                                        >
                                            <RefreshCw size={16} /> Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Device Selection */}
                            <div className="bg-white rounded-xl shadow-sm border p-5">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Smartphone size={16} className="text-blue-600" /> Pilih Device Pengirim
                                </h3>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-2 ${useWahaDefault ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" checked={useWahaDefault} onChange={() => { setUseWahaDefault(true); setSelectedDevices([]); }} className="w-4 h-4" />
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">WAHA Default</div>
                                        <div className="text-xs text-gray-500">Gunakan konfigurasi WAHA yang ada di Settings</div>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-3 ${!useWahaDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" checked={!useWahaDefault} onChange={() => setUseWahaDefault(false)} className="w-4 h-4" />
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">Device Terdaftar</div>
                                        <div className="text-xs text-gray-500">Pilih satu atau lebih device (round-robin jika lebih dari satu)</div>
                                    </div>
                                </label>

                                {!useWahaDefault && (
                                    <div className="space-y-2 pl-7">
                                        {devices.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">Belum ada device. Tambahkan di Settings Piutang.</p>
                                        ) : devices.map(d => (
                                            <label key={d.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${selectedDevices.includes(d.sessionId) ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100 hover:bg-gray-50'} ${d.status !== 'CONNECTED' ? 'opacity-50' : ''}`}>
                                                <input type="checkbox" checked={selectedDevices.includes(d.sessionId)} onChange={() => toggleDeviceSelect(d.sessionId)} disabled={d.status !== 'CONNECTED'} className="w-4 h-4" />
                                                <div className={`w-2 h-2 rounded-full ${d.status === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                <div>
                                                    <div className="font-bold text-gray-800 text-xs">{d.name}</div>
                                                    <div className="text-[10px] text-gray-500">{d.phone || 'Belum terhubung'} — {d.status}</div>
                                                </div>
                                            </label>
                                        ))}
                                        {selectedDevices.length > 1 && (
                                            <p className="text-[10px] text-blue-600 font-bold mt-1">
                                                📡 Mode Round-Robin: pesan akan didistribusikan bergantian ke {selectedDevices.length} device
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Progress */}
                            {(sending || sendDone) && sendProgress.total > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-800">
                                            {sending && <RefreshCw size={14} className="animate-spin inline mr-2 text-green-600" />}
                                            Progress {sendDone ? '— Selesai!' : '— Mengirim...'}
                                        </h3>
                                        <span className="text-sm font-mono text-gray-500">
                                            {sendProgress.sent + sendProgress.failed} / {sendProgress.total}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                        <div className="h-full flex">
                                            <div className="bg-green-500 transition-all duration-300" style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}></div>
                                            <div className="bg-red-500 transition-all duration-300" style={{ width: `${(sendProgress.failed / sendProgress.total) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-sm font-bold">
                                        <span className="text-green-600">✅ Terkirim: {sendProgress.sent}</span>
                                        <span className="text-red-600">❌ Gagal: {sendProgress.failed}</span>
                                        <span className="text-gray-500">⏳ Sisa: {sendProgress.total - sendProgress.sent - sendProgress.failed}</span>
                                    </div>
                                </div>
                            )}

                            {/* Send Log */}
                            {sendResults.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 text-sm">Log Pengiriman</div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b sticky top-0">
                                                <tr>
                                                    <th className="p-2 text-left font-bold text-gray-600 bg-gray-50">#</th>
                                                    <th className="p-2 text-left font-bold text-gray-600 bg-gray-50">Nama</th>
                                                    <th className="p-2 text-left font-bold text-gray-600 bg-gray-50">Nomor</th>
                                                    <th className="p-2 text-center font-bold text-gray-600 bg-gray-50">Status</th>
                                                    <th className="p-2 text-left font-bold text-gray-600 bg-gray-50">Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {sendResults.map((r, idx) => (
                                                    <tr key={idx} className={r.status === 'SENT' ? 'bg-green-50/50' : 'bg-red-50/50'}>
                                                        <td className="p-2 text-gray-400 text-xs">{r.index + 1}</td>
                                                        <td className="p-2 font-bold text-gray-800">{r.name}</td>
                                                        <td className="p-2 font-mono text-xs text-gray-600">{r.phone}</td>
                                                        <td className="p-2 text-center">
                                                            {r.status === 'SENT'
                                                                ? <span className="text-green-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={12} /> SENT</span>
                                                                : <span className="text-red-600 font-bold text-xs flex items-center justify-center gap-1"><XCircle size={12} /> FAIL</span>
                                                            }
                                                        </td>
                                                        <td className="p-2 text-xs text-gray-500">{r.error || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========= TAB: HISTORY ========= */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Total Terkirim</div>
                                    <div className="text-2xl font-bold text-green-600">{historyStats.SENT || 0}</div>
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Total Gagal</div>
                                    <div className="text-2xl font-bold text-red-600">{historyStats.FAILED || 0}</div>
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Total Pending</div>
                                    <div className="text-2xl font-bold text-yellow-600">{historyStats.PENDING || 0}</div>
                                </div>
                                <div className="bg-white border rounded-xl p-4 shadow-sm">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Total Log</div>
                                    <div className="text-2xl font-bold text-gray-700">{historyLogs.length}</div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-700">Riwayat Pengiriman (200 terakhir)</h3>
                                <button onClick={fetchHistory} disabled={loadingHistory} className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1">
                                    <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} /> Refresh
                                </button>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="max-h-[500px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b sticky top-0">
                                            <tr>
                                                <th className="p-3 text-left font-bold text-gray-600 bg-gray-50">Waktu</th>
                                                <th className="p-3 text-left font-bold text-gray-600 bg-gray-50">Customer</th>
                                                <th className="p-3 text-left font-bold text-gray-600 bg-gray-50">No HP</th>
                                                <th className="p-3 text-center font-bold text-gray-600 bg-gray-50">Status</th>
                                                <th className="p-3 text-left font-bold text-gray-600 bg-gray-50">Source</th>
                                                <th className="p-3 text-left font-bold text-gray-600 bg-gray-50">Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {loadingHistory ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
                                            ) : historyLogs.length === 0 ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Belum ada riwayat broadcast.</td></tr>
                                            ) : historyLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50">
                                                    <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.sentAt).toLocaleString('id-ID')}</td>
                                                    <td className="p-3 font-bold text-gray-800">{log.customerName}</td>
                                                    <td className="p-3 font-mono text-xs text-gray-600">{log.phone}</td>
                                                    <td className="p-3 text-center">
                                                        {log.status === 'SENT'
                                                            ? <span className="text-green-600 font-bold text-xs">✅ SENT</span>
                                                            : <span className="text-red-600 font-bold text-xs">❌ {log.status}</span>
                                                        }
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-500">{log.source}</td>
                                                    <td className="p-3 text-xs text-red-500 max-w-[200px] truncate" title={log.error}>{log.error || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
