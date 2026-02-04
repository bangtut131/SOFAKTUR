"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";

// --- Helper Functions for Cron Parsing/Generation ---
// Cron Format: Minute Hour DayOfMonth Month DayOfWeek
// Daily:   "30 8 * * *" (08:30 daily)
// Weekly:  "0 9 * * 1" (09:00 every Monday)
// Monthly: "0 10 1 * *" (10:00 on the 1st of every month)

const parseCronRaw = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length < 5) return { type: 'DAILY', time: '08:00', day: '1', date: '1' };

    const [min, hour, dom, month, dow] = parts;
    const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;

    if (dom !== '*' && month === '*') {
        return { type: 'MONTHLY', time, day: '1', date: dom };
    } else if (dow !== '*' && dom === '*') {
        return { type: 'WEEKLY', time, day: dow, date: '1' };
    } else {
        return { type: 'DAILY', time, day: '1', date: '1' };
    }
};

const formatCronRaw = (type: string, time: string, dayOrDate: string) => {
    const [h, m] = time.split(':');
    const min = parseInt(m || '0');
    const hour = parseInt(h || '0');

    if (type === 'DAILY') {
        return `${min} ${hour} * * *`;
    } else if (type === 'WEEKLY') {
        // dayOrDate is 0-6 or 1-7
        return `${min} ${hour} * * ${dayOrDate}`;
    } else if (type === 'MONTHLY') {
        // dayOrDate is 1-31
        return `${min} ${hour} ${dayOrDate} * *`;
    }
    return `0 8 * * 1`; // Fallback
};

export default function PiutangSettingsPage() {
    const router = useRouter();
    const [schedules, setSchedules] = useState<any[]>([]);

    // WAHA State
    const [wahaUrl, setWahaUrl] = useState("");
    const [wahaApiKey, setWahaApiKey] = useState("");
    const [wahaSessionId, setWahaSessionId] = useState("");

    // Test States
    const [testPhone, setTestPhone] = useState("");
    const [sendingTest, setSendingTest] = useState(false);

    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [testMessageTemplate, setTestMessageTemplate] = useState("Halo {customerName},\n\nAnda memiliki tagihan sebesar {totalOwing}. Mohon segera dilunasi.\n\nDetail:\n{invoiceList}\n\nTerima kasih.");

    useEffect(() => {
        fetch('/api/piutang/settings')
            .then(res => res.json())
            .then(data => {
                setSchedules(data.schedules || []);
                setWahaUrl(data.wahaUrl || "");
                setWahaApiKey(data.wahaApiKey || "");
                setWahaSessionId(data.wahaSessionId || "");
            })
            .catch(err => console.error(err));

        // Fetch customers for testing
        fetch('/api/piutang')
            .then(res => res.json())
            .then(data => {
                setCustomers(data.customers || []);
            });
    }, []);

    const handleSaveWaha = async () => {
        try {
            const res = await fetch('/api/piutang/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wahaUrl, wahaApiKey, wahaSessionId })
            });
            if (res.ok) alert("Konfigurasi WAHA disimpan!");
            else alert("Gagal menyimpan");
        } catch (e) { alert("Error"); }
    };

    const handleTestWaha = async () => {
        if (!testPhone) return alert("Masukkan nomor HP!");
        setSendingTest(true);
        try {
            const res = await fetch('/api/piutang/test-waha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: testPhone, message: "Tes Koneksi WAHA Berhasil!" })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert("Pesan Terkirim! Cek WhatsApp tujuan.");
            } else {
                alert("Gagal kirim: " + (data.error || "Unknown error"));
            }
        } catch (e) { alert("Error connecting to server"); }
        finally { setSendingTest(false); }
    };

    const handleTestBroadcast = async () => {
        if (!selectedCustomerId) return alert("Pilih customer terlebih dahulu!");
        if (!testPhone) return alert("Masukkan nomor HP tujuan test!");

        setSendingTest(true);
        try {
            const res = await fetch('/api/piutang/broadcast/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomerId,
                    targetPhone: testPhone,
                    template: testMessageTemplate
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert("Test Broadcast Terkirim! Silakan cek WhatsApp.");
            } else {
                alert("Gagal kirim: " + (data.error || "Unknown error"));
            }
        } catch (e) { alert("Error connecting to server"); }
        finally { setSendingTest(false); }
    };

    const handleSave = async (schedule: any) => {
        try {
            const res = await fetch('/api/piutang/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(schedule)
            });
            if (res.ok) {
                alert("Disimpan!");
                const updated = await res.json();
                setSchedules(prev => prev.map(s => s.id === updated.schedule.id ? updated.schedule : s));
            } else {
                alert("Gagal menyimpan");
            }
        } catch (e) { console.error(e); alert("Error"); }
    };

    const handleAddNew = () => {
        const newSchedule = {
            id: null,
            name: `New Schedule ${new Date().getTime().toString().slice(-4)}`,
            type: 'BROADCAST',
            cronExpression: "0 9 * * 1",
            isEnabled: false,
            messageTemplate: "Halo {customerName},\n\nAnda memiliki tagihan sebesar {totalOwing}. Mohon segera dilunasi.\n\nDetail:\n{invoiceList}\n\nTerima kasih."
        };

        fetch('/api/piutang/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSchedule)
        }).then(res => res.json()).then(data => {
            if (data.success) {
                setSchedules([...schedules, data.schedule]);
            }
        });
    };

    // Component for editing Cron in a friendly way
    const CronEditor = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
        const parsed = parseCronRaw(value);
        const [type, setType] = useState(parsed.type);
        const [time, setTime] = useState(parsed.time);
        const [dayOrDate, setDayOrDate] = useState(parsed.type === 'WEEKLY' ? parsed.day : parsed.date);

        useEffect(() => {
            const p = parseCronRaw(value);
            setType(p.type);
            setTime(p.time);
            setDayOrDate(p.type === 'WEEKLY' ? p.day : p.date);
        }, [value]);

        const updateCron = (t: string, tm: string, dd: string) => {
            onChange(formatCronRaw(t, tm, dd));
        };

        return (
            <div className="flex gap-2 items-center flex-wrap">
                <select
                    className="p-2 border rounded font-bold text-gray-900 text-sm"
                    value={type}
                    onChange={(e) => {
                        const newType = e.target.value;
                        setType(newType);
                        updateCron(newType, time, dayOrDate);
                    }}
                >
                    <option value="DAILY">Setiap Hari</option>
                    <option value="WEEKLY">Setiap Minggu</option>
                    <option value="MONTHLY">Setiap Bulan</option>
                </select>

                {type === 'WEEKLY' && (
                    <select
                        className="p-2 border rounded text-gray-900 text-sm"
                        value={dayOrDate}
                        onChange={(e) => {
                            setDayOrDate(e.target.value);
                            updateCron(type, time, e.target.value);
                        }}
                    >
                        <option value="1">Senin</option>
                        <option value="2">Selasa</option>
                        <option value="3">Rabu</option>
                        <option value="4">Kamis</option>
                        <option value="5">Jumat</option>
                        <option value="6">Sabtu</option>
                        <option value="0">Minggu</option>
                    </select>
                )}

                {type === 'MONTHLY' && (
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 font-bold">Tgl:</span>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            className="p-2 border rounded w-16 text-gray-900 text-sm"
                            value={dayOrDate}
                            onChange={(e) => {
                                setDayOrDate(e.target.value);
                                updateCron(type, time, e.target.value);
                            }}
                        />
                    </div>
                )}

                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 font-bold">Jam:</span>
                    <input
                        type="time"
                        className="p-2 border rounded text-gray-900 text-sm"
                        value={time}
                        onChange={(e) => {
                            setTime(e.target.value);
                            updateCron(type, e.target.value, dayOrDate);
                        }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 shadow-sm border-b shrink-0 flex items-center gap-4">
                <button onClick={() => router.push('/piutang')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                    <ArrowLeft />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Pengaturan Broadcast & Jadwal</h1>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-auto max-w-4xl mx-auto w-full">
                {/* WAHA Config Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 mb-6 space-y-4">
                    <h2 className="text-lg font-bold text-gray-700 border-b pb-2">Konfigurasi WAHA (WhatsApp Gateway)</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WAHA API URL</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded font-mono text-sm text-gray-900"
                                value={wahaUrl}
                                onChange={(e) => setWahaUrl(e.target.value)}
                                placeholder="https://your-waha-url.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Session ID</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded font-mono text-sm text-gray-900"
                                value={wahaSessionId}
                                onChange={(e) => setWahaSessionId(e.target.value)}
                                placeholder="default"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key (Optional)</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded font-mono text-sm text-gray-900"
                                value={wahaApiKey}
                                onChange={(e) => setWahaApiKey(e.target.value)}
                                placeholder="secret_key"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-end pt-4 border-t">
                        <div className="flex items-end gap-2">
                            <div className="w-48">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tes Kirim WA ke:</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded text-sm text-gray-900"
                                    placeholder="6281234..."
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleTestWaha}
                                disabled={sendingTest}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-lg font-bold text-xs h-[38px] disabled:opacity-50"
                            >
                                {sendingTest ? 'Sending...' : 'Test Connection'}
                            </button>
                        </div>

                        <button
                            onClick={handleSaveWaha}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                        >
                            <Save size={16} /> Simpan Config
                        </button>
                    </div>
                </div>

                {/* Broadcast Testing Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 mb-6 space-y-4">
                    <h2 className="text-lg font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                        <span>🧪</span> Broadcast Testing
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Customer (Data Source)</label>
                            <select
                                className="w-full p-2 border rounded font-bold text-gray-900 text-sm"
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                            >
                                <option value="">- Pilih Customer -</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(c.totalOwing)})</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1">Data tagihan customer ini akan digunakan.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor HP Tujuan Test</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded text-sm text-gray-900"
                                placeholder="628xxx (Nomor Anda)"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Pesan akan dikirim ke nomor ini, BUKAN ke customer.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Template Test</label>
                        <textarea
                            className="w-full p-3 border rounded text-sm min-h-[80px] text-gray-900"
                            value={testMessageTemplate}
                            onChange={(e) => setTestMessageTemplate(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleTestBroadcast}
                            disabled={sendingTest || !selectedCustomerId}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className="text-lg">📨</span> {sendingTest ? 'Mengirim...' : 'Kirim Test Broadcast'}
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-700">Daftar Jadwal</h2>
                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                        <Plus size={16} /> Tambah Jadwal
                    </button>
                </div>

                <div className="space-y-6">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Jadwal</label>
                                    <input
                                        type="text"
                                        className="w-full text-lg font-bold border-b border-gray-300 focus:border-blue-500 outline-none pb-1 text-gray-900"
                                        value={schedule.name}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, name: val } : s));
                                        }}
                                    />
                                </div>
                                <div className="ml-4">
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={schedule.isEnabled}
                                                onChange={(e) => {
                                                    const val = e.target.checked;
                                                    const updated = { ...schedule, isEnabled: val };
                                                    setSchedules(prev => prev.map(s => s.id === schedule.id ? updated : s));
                                                    handleSave(updated);
                                                }}
                                            />
                                            <div className={`block w-10 h-6 rounded-full ${schedule.isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${schedule.isEnabled ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <div className="ml-3 text-sm font-bold text-gray-700">
                                            {schedule.isEnabled ? 'Aktif' : 'Non-Aktif'}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe</label>
                                    <select
                                        className="w-full p-2 border rounded font-bold text-gray-900"
                                        value={schedule.type}
                                        onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, type: e.target.value } : s))}
                                    >
                                        <option value="SYNC">Auto Sync Accurate</option>
                                        <option value="BROADCAST">Auto Broadcast WA</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jadwal Eksekusi</label>
                                    <CronEditor
                                        value={schedule.cronExpression}
                                        onChange={(val) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, cronExpression: val } : s))}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Raw: {schedule.cronExpression}</p>
                                </div>
                            </div>

                            {schedule.type === 'BROADCAST' && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Template Pesan</label>
                                    <textarea
                                        className="w-full p-3 border rounded text-sm min-h-[120px] text-gray-900"
                                        value={schedule.messageTemplate || ''}
                                        onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, messageTemplate: e.target.value } : s))}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Variables: {'{customerName}'}, {'{totalOwing}'}, {'{invoiceList}'}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 border-t pt-4">
                                <button className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm font-bold flex items-center gap-1">
                                    <Trash size={14} /> Hapus
                                </button>
                                <button
                                    onClick={() => handleSave(schedule)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                                >
                                    <Save size={16} /> Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
