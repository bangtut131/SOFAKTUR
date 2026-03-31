"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save, Plus, Trash, Key, Smartphone, RefreshCw, QrCode, Wifi, WifiOff, Loader } from "lucide-react";
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
    const [branches, setBranches] = useState<any[]>([]); // Added branches state
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [testMessageTemplate, setTestMessageTemplate] = useState("Halo {customerName},\n\nAnda memiliki tagihan sebesar {totalOwing}. Mohon segera dilunasi.\n\nDetail:\n{invoiceList}\n\nTerima kasih.");

    // Device Management State
    const [devices, setDevices] = useState<any[]>([]);
    const [newDeviceName, setNewDeviceName] = useState('');
    const [addingDevice, setAddingDevice] = useState(false);
    const [qrData, setQrData] = useState<{ [key: string]: string | null }>({});
    const [qrMessage, setQrMessage] = useState<{ [key: string]: string | null }>({});
    const [loadingQr, setLoadingQr] = useState<{ [key: string]: boolean }>({});
    const [checkingStatus, setCheckingStatus] = useState<{ [key: string]: boolean }>({});

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

        // Fetch branches for sync params
        fetch('/api/admin/branches')
            .then(res => res.json())
            .then(data => {
                if (data.success) setBranches(data.branches || []);
            });

        // Fetch devices
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await fetch('/api/broadcast/devices');
            const data = await res.json();
            if (data.success) setDevices(data.devices || []);
        } catch (e) { console.error('Failed to fetch devices', e); }
    };

    const handleAddDevice = async () => {
        if (!newDeviceName.trim()) return alert('Masukkan nama device');
        setAddingDevice(true);
        try {
            const res = await fetch('/api/broadcast/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeviceName.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setNewDeviceName('');
                await fetchDevices();
                // Auto-fetch QR for new device
                if (data.device?.id) handleFetchQr(data.device.id);
            } else {
                alert('Error: ' + (data.error || 'Unknown'));
            }
        } catch (e: any) { alert('Error: ' + e.message); }
        finally { setAddingDevice(false); }
    };

    const handleDeleteDevice = async (id: string) => {
        if (!confirm('Yakin hapus device ini?')) return;
        try {
            await fetch(`/api/broadcast/devices/${id}`, { method: 'DELETE' });
            await fetchDevices();
        } catch (e: any) { alert('Error: ' + e.message); }
    };

    const handleFetchQr = async (id: string) => {
        setLoadingQr(prev => ({ ...prev, [id]: true }));
        setQrMessage(prev => ({ ...prev, [id]: null }));
        try {
            const res = await fetch(`/api/broadcast/devices/${id}/qr`);
            const data = await res.json();
            if (data.qr) {
                setQrData(prev => ({ ...prev, [id]: data.qr }));
            } else {
                setQrData(prev => ({ ...prev, [id]: null }));
                setQrMessage(prev => ({ ...prev, [id]: data.message || data.error || 'QR tidak tersedia' }));
            }
        } catch (e: any) {
            setQrMessage(prev => ({ ...prev, [id]: 'Error: ' + e.message }));
        }
        finally { setLoadingQr(prev => ({ ...prev, [id]: false })); }
    };

    const handleCheckStatus = async (id: string) => {
        setCheckingStatus(prev => ({ ...prev, [id]: true }));
        try {
            const res = await fetch(`/api/broadcast/devices/${id}/status`);
            const data = await res.json();
            if (data.success) {
                setDevices(prev => prev.map(d => d.id === id ? { ...d, status: data.status, phone: data.phone || d.phone } : d));
            }
        } catch (e) { console.error('Status check failed', e); }
        finally { setCheckingStatus(prev => ({ ...prev, [id]: false })); }
    };

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

                {/* === Device Management Section === */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-6 space-y-4">
                    <h2 className="text-lg font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                        <Smartphone size={18} className="text-blue-600" /> Device Pengirim WA
                    </h2>
                    <p className="text-xs text-gray-500">Daftarkan nomor WhatsApp tambahan sebagai device pengirim. Setiap device perlu scan QR code untuk autentikasi.</p>

                    {/* Add New Device */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Device Baru</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded text-sm text-gray-900"
                                value={newDeviceName}
                                onChange={(e) => setNewDeviceName(e.target.value)}
                                placeholder="Contoh: WA Collector Andi"
                            />
                        </div>
                        <button
                            onClick={handleAddDevice}
                            disabled={addingDevice || !newDeviceName.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 h-[38px]"
                        >
                            {addingDevice ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                            Tambah Device
                        </button>
                    </div>

                    {/* Device List */}
                    {devices.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border-2 border-dashed">
                            Belum ada device terdaftaTambahkan device untuk mulai broadcast via nomor WA lain.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {devices.map(device => (
                                <div key={device.id} className={`border rounded-lg p-4 ${device.status === 'CONNECTED' ? 'border-green-200 bg-green-50/30' : device.status === 'SCAN_QR' ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${device.status === 'CONNECTED' ? 'bg-green-500' : device.status === 'SCAN_QR' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">{device.name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    <span className="font-mono">{device.phone || 'Belum terhubung'}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                                        style={{
                                                            background: device.status === 'CONNECTED' ? '#dcfce7' : device.status === 'SCAN_QR' ? '#fef9c3' : '#f3f4f6',
                                                            color: device.status === 'CONNECTED' ? '#166534' : device.status === 'SCAN_QR' ? '#854d0e' : '#6b7280',
                                                        }}
                                                    >
                                                        {device.status === 'CONNECTED' ? '✅ Connected' : device.status === 'SCAN_QR' ? '📱 Scan QR' : '❌ Disconnected'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleCheckStatus(device.id)}
                                                disabled={checkingStatus[device.id]}
                                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-xs disabled:opacity-50"
                                                title="Cek Status"
                                            >
                                                <RefreshCw size={14} className={checkingStatus[device.id] ? 'animate-spin' : ''} />
                                            </button>
                                            {device.status !== 'CONNECTED' && (
                                                <button
                                                    onClick={() => handleFetchQr(device.id)}
                                                    disabled={loadingQr[device.id]}
                                                    className="p-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-600 text-xs disabled:opacity-50"
                                                    title="Tampilkan QR Code"
                                                >
                                                    <QrCode size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteDevice(device.id)}
                                                className="p-2 bg-red-50 hover:bg-red-100 rounded text-red-600 text-xs"
                                                title="Hapus Device"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* QR Code Display */}
                                    {qrData[device.id] && device.status !== 'CONNECTED' && (
                                        <div className="mt-3 pt-3 border-t text-center">
                                            <p className="text-xs text-gray-500 font-bold mb-2">Scan QR Code ini dari WhatsApp Anda:</p>
                                            <div className="inline-block bg-white p-4 rounded-lg border shadow-sm">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData[device.id]!)}`}
                                                    alt="QR Code"
                                                    className="w-64 h-64"
                                                    onError={(e) => {
                                                        // Fallback: show raw QR string if image fails
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2">Buka WhatsApp → Linked Devices → Link a Device → Scan QR</p>
                                            <button
                                                onClick={() => { handleFetchQr(device.id); handleCheckStatus(device.id); }}
                                                className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                                            >
                                                Refresh QR / Cek Status
                                            </button>
                                        </div>
                                    )}

                                    {/* QR Message (info/error) */}
                                    {!qrData[device.id] && qrMessage[device.id] && !loadingQr[device.id] && (
                                        <div className="mt-3 pt-3 border-t text-center">
                                            <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                                                {qrMessage[device.id]}
                                            </p>
                                            <button
                                                onClick={() => handleFetchQr(device.id)}
                                                className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                                            >
                                                Coba Lagi
                                            </button>
                                        </div>
                                    )}

                                    {loadingQr[device.id] && (
                                        <div className="mt-3 pt-3 border-t text-center">
                                            <Loader size={20} className="animate-spin inline text-blue-500" />
                                            <p className="text-xs text-gray-400 mt-1">Memuat QR Code...</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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

                            {/* Parameters for SYNC */}
                            {(schedule.type === 'SYNC') && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                    <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Key size={14} /> Parameter Auto-Sync</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Pilih Cabang</label>
                                            <select
                                                className="w-full p-2 border rounded text-sm text-gray-900"
                                                value={schedule.branchId || ""}
                                                onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, branchId: e.target.value || null } : s))}
                                            >
                                                <option value="">Semua Cabang</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Status Invoice</label>
                                            <select
                                                className="w-full p-2 border rounded text-sm text-gray-900"
                                                value={schedule.invoiceStatus || "UNPAID"}
                                                onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, invoiceStatus: e.target.value } : s))}
                                            >
                                                <option value="UNPAID">Belum Lunas (Unpaid)</option>
                                                <option value="PAID">Lunas (Paid)</option>
                                                <option value="ALL">Semua Status</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Dari Tanggal (Opsional)</label>
                                            <input
                                                type="date"
                                                className="w-full p-2 border rounded text-sm text-gray-900"
                                                value={schedule.startDate ? new Date(schedule.startDate).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, startDate: e.target.value ? new Date(e.target.value) : null } : s))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Sampai Tanggal (Opsional)</label>
                                            <input
                                                type="date"
                                                className="w-full p-2 border rounded text-sm text-gray-900"
                                                value={schedule.endDate ? new Date(schedule.endDate).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, endDate: e.target.value ? new Date(e.target.value) : null } : s))}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-2 italic">
                                        * Jika cabang tidak dipilih, akan sinkronisasi SEMUA cabang.
                                    </p>
                                </div>
                            )}

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

                            {schedule.type === 'BROADCAST' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 border-t pt-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min. Umur Faktur (Hari)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded font-bold text-gray-900 text-sm"
                                            placeholder="Contoh: 30"
                                            value={schedule.minDaysSinceTrans || ''}
                                            onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, minDaysSinceTrans: e.target.value ? parseInt(e.target.value) : null } : s))}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Hanya kirim jike umur faktur &ge; X hari (Sejak tgl transaksi)</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min. Lewat Jatuh Tempo (Hari)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded font-bold text-gray-900 text-sm"
                                            placeholder="Contoh: 7"
                                            value={schedule.minDaysOverdue || ''}
                                            onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, minDaysOverdue: e.target.value ? parseInt(e.target.value) : null } : s))}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Hanya kirim jika sudah jatuh tempo &ge; X hari</p>
                                    </div>
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
