"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Shield, Key, Save, Trash2, Plus, Edit, Clock, Calendar, FileText, AlertCircle, CheckCircle, Database, Upload, Download, RefreshCw } from "lucide-react";

interface User {
    id: string;
    username: string;
    role: string;
}

const AVAILABLE_COLUMNS = [
    { key: 'transNo', label: 'No Faktur' },
    { key: 'transDate', label: 'Tanggal' },
    { key: 'customerName', label: 'Nama Customer' },
    { key: 'amount', label: 'Total Nilai' },
    { key: 'primeOwing', label: 'Sisa Tagihan' },
    { key: 'description', label: 'Keterangan' },
    { key: 'approvalStatus', label: 'Status Approval' },
];

// Cron Helper
const parseCronRaw = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length < 5) return { type: 'DAILY', time: '08:00', day: '1', date: '1' };
    const [min, hour, dom, month, dow] = parts;
    const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
    if (dom !== '*' && month === '*') return { type: 'MONTHLY', time, day: '1', date: dom };
    else if (dow !== '*' && dom === '*') return { type: 'WEEKLY', time, day: dow, date: '1' };
    else return { type: 'DAILY', time, day: '1', date: '1' };
};

const formatCronRaw = (type: string, time: string, dayOrDate: string) => {
    const [h, m] = time.split(':');
    const min = parseInt(m || '0');
    const hour = parseInt(h || '0');
    if (type === 'DAILY') return `${min} ${hour} * * *`;
    else if (type === 'WEEKLY') return `${min} ${hour} * * ${dayOrDate}`;
    else if (type === 'MONTHLY') return `${min} ${hour} ${dayOrDate} * *`;
    return `0 8 * * 1`;
};

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

export default function SettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('USERS');
    const [isAdmin, setIsAdmin] = useState(false);

    // User Management State
    const [users, setUsers] = useState<User[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formUser, setFormUser] = useState({ username: '', password: '', role: 'STAFF' });

    // Role Config State
    const [roleConfigs, setRoleConfigs] = useState<Record<string, string[]>>({
        'STAFF': AVAILABLE_COLUMNS.map(c => c.key),
        'FINANCE': AVAILABLE_COLUMNS.map(c => c.key),
    });

    // Schedule State
    const [schedules, setSchedules] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);

    // Logs State
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Backup / Restore State
    const [backupLoading, setBackupLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreFile, setRestoreFile] = useState<any>(null);
    const [restorePreview, setRestorePreview] = useState<any>(null);
    const [restoreResult, setRestoreResult] = useState<any>(null);

    useEffect(() => {
        // Check role
        const role = getCookie('user_role');
        setIsAdmin(role === 'ADMIN');

        fetchUsers();
        fetchSettings();
        fetchSchedules();
        fetchBranches();
    }, []);

    // Helper: basic cookie parser
    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    const fetchUsers = async () => {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (data.success) setUsers(data.users);
    };

    const fetchSettings = async () => {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success) {
            const newConfigs: any = { ...roleConfigs };
            data.configs.forEach((c: any) => {
                try {
                    newConfigs[c.role] = JSON.parse(c.visibleColumns);
                } catch (e) { }
            });
            setRoleConfigs(newConfigs);
        }
    };

    const fetchSchedules = async () => {
        const res = await fetch('/api/admin/schedules');
        const data = await res.json();
        if (data.success) setSchedules(data.schedules);
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/admin/branches');
            const data = await res.json();
            if (data.success) setBranches(data.branches);
        } catch (e) {
            console.error("Failed to fetch branches", e);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch('/api/admin/logs?limit=100');
            const data = await res.json();
            if (data.success) setLogs(data.logs);
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Load logs when tab switched
    useEffect(() => {
        if (activeTab === 'LOGS') fetchLogs();
    }, [activeTab]);

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
        const method = editingUser ? 'PATCH' : 'POST';

        const payload: any = { username: formUser.username, role: formUser.role };
        if (formUser.password) payload.password = formUser.password;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            fetchUsers();
            setIsUserModalOpen(false);
            setEditingUser(null);
            setFormUser({ username: '', password: '', role: 'STAFF' });
            alert("Berhasil disimpan");
        } else {
            alert("Gagal menyimpan user");
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (!confirm(`Hapus user ${name}?`)) return;
        await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        fetchUsers();
    };

    const toggleColumn = (role: string, colKey: string) => {
        const current = roleConfigs[role] || [];
        const next = current.includes(colKey)
            ? current.filter(k => k !== colKey)
            : [...current, colKey];

        setRoleConfigs({ ...roleConfigs, [role]: next });
    };

    const saveRoleConfig = async (role: string) => {
        await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, visibleColumns: roleConfigs[role] })
        });
        alert(`Setting role ${role} tersimpan!`);
    };

    const handleSaveSchedule = async (schedule: any) => {
        const res = await fetch('/api/admin/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedule)
        });
        if (res.ok) {
            const data = await res.json();
            alert("Jadwal tersimpan!");
            fetchSchedules();
        } else {
            alert("Gagal menyimpan jadwal");
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm("Hapus jadwal ini?")) return;
        await fetch(`/api/admin/schedules?id=${id}`, { method: 'DELETE' });
        fetchSchedules();
    };

    const handleAddSchedule = () => {
        const newSchedule = {
            id: null,
            name: `New Schedule ${new Date().getTime().toString().slice(-4)}`,
            type: 'SO_SYNC',
            cronExpression: "0 8 * * *",
            isEnabled: false,
            messageTemplate: null,
            minDaysSinceTrans: null,
            minDaysOverdue: null,
            branchId: null,
            startDate: null,
            endDate: null,
            invoiceStatus: 'UNPAID'
        };
        handleSaveSchedule(newSchedule);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="flex items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border">
                <button onClick={() => router.push('/dashboard')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                    <ArrowLeft className="text-gray-900" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
            </header>

            <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border p-4 h-fit">
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('USERS')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${activeTab === 'USERS' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <Users size={18} /> User Management
                        </button>
                        <button
                            onClick={() => setActiveTab('ROLES')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${activeTab === 'ROLES' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <Shield size={18} /> Role Permissions
                        </button>
                        <button
                            onClick={() => setActiveTab('SCHEDULES')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${activeTab === 'SCHEDULES' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            <Clock size={18} /> Otomatisasi & Jadwal
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('LOGS')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${activeTab === 'LOGS' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <FileText size={18} /> System Logs
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('BACKUP')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition ${activeTab === 'BACKUP' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <Database size={18} /> Backup & Restore
                            </button>
                        )}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border p-6 min-h-[500px]">

                    {/* USERS TAB */}
                    {activeTab === 'USERS' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Daftar User</h2>
                                <button
                                    onClick={() => { setEditingUser(null); setFormUser({ username: '', password: '', role: 'STAFF' }); setIsUserModalOpen(true); }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700"
                                >
                                    <Plus size={16} /> Tambah User
                                </button>
                            </div>

                            <div className="overflow-hidden border rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-gray-900 font-bold border-b">
                                        <tr>
                                            <th className="p-3">Username</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-bold text-gray-900">{u.username}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-900 border-purple-200' : u.role === 'FINANCE' ? 'bg-yellow-100 text-yellow-900 border-yellow-200' : 'bg-green-100 text-green-900 border-green-200'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right flex justify-end gap-2">
                                                    <button onClick={() => { setEditingUser(u); setFormUser({ username: u.username, password: '', role: u.role }); setIsUserModalOpen(true); }} className="p-2 text-blue-700 hover:bg-blue-50 rounded">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(u.id, u.username)} className="p-2 text-red-700 hover:bg-red-50 rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ROLES TAB */}
                    {activeTab === 'ROLES' && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                                    Konfigurasi Akses Kolom Staff
                                    <button onClick={() => saveRoleConfig('STAFF')} className="text-sm bg-green-600 text-white px-3 py-1 rounded flex gap-2 items-center hover:bg-green-700"><Save size={14} /> Simpan</button>
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {AVAILABLE_COLUMNS.map(col => (
                                        <label key={col.key} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                            <input
                                                type="checkbox"
                                                checked={(roleConfigs['STAFF'] || []).includes(col.key)}
                                                onChange={() => toggleColumn('STAFF', col.key)}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="text-sm font-bold text-gray-800">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-gray-200" />

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                                    Konfigurasi Akses Kolom Finance
                                    <button onClick={() => saveRoleConfig('FINANCE')} className="text-sm bg-green-600 text-white px-3 py-1 rounded flex gap-2 items-center hover:bg-green-700"><Save size={14} /> Simpan</button>
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {AVAILABLE_COLUMNS.map(col => (
                                        <label key={col.key} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                            <input
                                                type="checkbox"
                                                checked={(roleConfigs['FINANCE'] || []).includes(col.key)}
                                                onChange={() => toggleColumn('FINANCE', col.key)}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="text-sm font-bold text-gray-800">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCHEDULES TAB */}
                    {activeTab === 'SCHEDULES' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Task Scheduling & Automation</h2>
                                <button
                                    onClick={handleAddSchedule}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700"
                                >
                                    <Plus size={16} /> Tambah Jadwal Baru
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
                                                                handleSaveSchedule(updated);
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
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Task</label>
                                                <select
                                                    className="w-full p-2 border rounded font-bold text-gray-900"
                                                    value={schedule.type}
                                                    onChange={(e) => setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, type: e.target.value } : s))}
                                                >
                                                    <option value="SO_SYNC">SO Auto-Sync (Buat Sesi SO Baru)</option>
                                                    <option value="SYNC">Piutang Sync (Update Data Outstanding)</option>
                                                    <option value="BROADCAST">Auto Broadcast WA (Penagihan)</option>
                                                </select>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {schedule.type === 'SO_SYNC' && "Otomatis menarik data Faktur dari Accurate & membuat Sesi SO baru."}
                                                    {schedule.type === 'SYNC' && "Otomatis menyamakan data piutang dengan Accurate tanpa buat sesi baru."}
                                                    {schedule.type === 'BROADCAST' && "Mengirim pesan WA tagihan secara otomatis ke customer."}
                                                </p>
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

                                        {/* Parameters for SO_SYNC and SYNC */}
                                        {(schedule.type === 'SO_SYNC' || schedule.type === 'SYNC') && (
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
                                                    {schedule.type === 'SO_SYNC' && (
                                                        <>
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
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-xs text-blue-600 mt-2 italic">
                                                    * Jika cabang tidak dipilih, akan sinkronisasi SEMUA cabang.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 border-t pt-4">
                                            <button
                                                onClick={() => handleDeleteSchedule(schedule.id)}
                                                className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm font-bold flex items-center gap-1"
                                            >
                                                <Trash2 size={14} /> Hapus
                                            </button>
                                            <button
                                                onClick={() => handleSaveSchedule(schedule)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                                            >
                                                <Save size={16} /> Simpan Perubahan
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'LOGS' && isAdmin && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-gray-900">System Logs (Last 100)</h2>
                                <button onClick={fetchLogs} className="text-blue-600 font-bold text-sm hover:underline">
                                    Refresh
                                </button>
                            </div>

                            {loadingLogs ? (
                                <p className="text-gray-500 text-sm">Loading logs...</p>
                            ) : (
                                <div className="overflow-hidden border rounded-lg">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-900 font-bold border-b">
                                            <tr>
                                                <th className="p-3">Waktu</th>
                                                <th className="p-3">Customer</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3">Message</th>
                                                <th className="p-3">Error Info</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {logs.length === 0 ? (
                                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Belum ada log aktifitas.</td></tr>
                                            ) : (
                                                logs.map(log => (
                                                    <tr key={log.id} className="hover:bg-gray-50">
                                                        <td className="p-3 text-xs text-gray-600 whitespace-nowrap">
                                                            {new Date(log.sentAt).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-bold text-gray-900">{log.customerName}</div>
                                                            <div className="text-xs text-gray-500">{log.phone}</div>
                                                        </td>
                                                        <td className="p-3">
                                                            {log.status === 'SENT' ? (
                                                                <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle size={12} /> SENT</span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-red-600 font-bold text-xs"><AlertCircle size={12} /> {log.status}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-xs text-gray-700 max-w-[200px] truncate" title={log.message}>{log.message}</td>
                                                        <td className="p-3 text-xs text-red-600 font-mono">{log.error || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BACKUP TAB */}
                    {activeTab === 'BACKUP' && isAdmin && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Database size={20} /> Backup & Restore Database
                            </h2>

                            {/* BACKUP Section */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                                <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                    <Download size={16} /> Backup Data
                                </h3>
                                <p className="text-sm text-green-700 mb-4">
                                    Download seluruh data database dalam format JSON. File ini bisa digunakan untuk restore jika terjadi masalah.
                                </p>
                                <button
                                    disabled={backupLoading}
                                    onClick={async () => {
                                        setBackupLoading(true);
                                        try {
                                            const res = await fetch('/api/admin/backup');
                                            if (!res.ok) { alert('Gagal backup'); return; }
                                            const blob = await res.blob();
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
                                            a.download = `SOFAKTUR_BACKUP_${dateStr}.json`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        } catch (e) {
                                            alert('Error download backup');
                                        } finally {
                                            setBackupLoading(false);
                                        }
                                    }}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-bold shadow transition"
                                >
                                    {backupLoading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                                    {backupLoading ? 'Downloading...' : 'Download Backup'}
                                </button>
                            </div>

                            {/* RESTORE Section */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                                <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                    <Upload size={16} /> Restore Data
                                </h3>
                                <p className="text-sm text-orange-700 mb-4">
                                    Upload file backup JSON untuk mengembalikan data. <span className="font-bold text-red-700">PERHATIAN: data saat ini akan DITIMPA oleh data dari file backup!</span>
                                </p>

                                <div className="mb-4">
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white p-2"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setRestoreResult(null);
                                            try {
                                                const text = await file.text();
                                                const json = JSON.parse(text);
                                                setRestoreFile(json);
                                                setRestorePreview(json.counts || {});
                                            } catch (err) {
                                                alert('File tidak valid. Pastikan file adalah backup JSON yang benar.');
                                                setRestoreFile(null);
                                                setRestorePreview(null);
                                            }
                                        }}
                                    />
                                </div>

                                {restorePreview && (
                                    <div className="bg-white border rounded-lg p-4 mb-4">
                                        <h4 className="text-sm font-bold text-gray-700 mb-2">Preview File Backup:</h4>
                                        {restoreFile?.exportedAt && (
                                            <p className="text-xs text-gray-500 mb-3">
                                                Dibuat: {new Date(restoreFile.exportedAt).toLocaleString('id-ID')}
                                            </p>
                                        )}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {Object.entries(restorePreview).map(([key, count]) => (
                                                <div key={key} className="bg-gray-50 rounded p-2 border">
                                                    <div className="text-[10px] uppercase font-bold text-gray-500">{key}</div>
                                                    <div className="text-lg font-bold text-gray-800">{String(count)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {restoreFile && (
                                    <button
                                        disabled={restoreLoading}
                                        onClick={async () => {
                                            if (!confirm('PERINGATAN!\n\nAnda akan MENIMPA seluruh data database dengan data dari file backup.\n\nProses ini TIDAK BISA dibatalkan.\n\nLanjutkan?')) return;
                                            if (!confirm('Konfirmasi TERAKHIR: Yakin restore data?')) return;
                                            setRestoreLoading(true);
                                            setRestoreResult(null);
                                            try {
                                                const res = await fetch('/api/admin/backup/restore', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ data: restoreFile.data }),
                                                });
                                                const result = await res.json();
                                                if (result.success) {
                                                    setRestoreResult(result);
                                                    alert('Restore berhasil!');
                                                } else {
                                                    alert('Gagal restore: ' + (result.error || 'Unknown error'));
                                                }
                                            } catch (e) {
                                                alert('Error restore data');
                                            } finally {
                                                setRestoreLoading(false);
                                            }
                                        }}
                                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-bold shadow transition"
                                    >
                                        {restoreLoading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {restoreLoading ? 'Restoring...' : 'Restore Data dari File'}
                                    </button>
                                )}

                                {restoreResult?.success && (
                                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-1">
                                            <CheckCircle size={14} /> Restore Berhasil!
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {Object.entries(restoreResult.results || {}).map(([key, count]) => (
                                                <div key={key} className="text-xs">
                                                    <span className="font-bold text-gray-700">{key}:</span>{' '}
                                                    <span className="text-green-700 font-bold">{String(count)} records</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl border border-gray-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-900">{editingUser ? 'Edit User' : 'Tambah User'}</h2>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-800">Username</label>
                                <input
                                    className="w-full border border-gray-300 p-2 rounded text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
                                    value={formUser.username}
                                    onChange={e => setFormUser({ ...formUser, username: e.target.value })}
                                    disabled={!!editingUser}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-800">Password {editingUser && '(Kosongkan jika tidak ubah)'}</label>
                                <input
                                    className="w-full border border-gray-300 p-2 rounded text-gray-900 font-medium focus:ring-2 focus:ring-blue-500"
                                    type="password"
                                    value={formUser.password}
                                    onChange={e => setFormUser({ ...formUser, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-800">Role</label>
                                <select
                                    className="w-full border border-gray-300 p-2 rounded text-gray-900 font-bold focus:ring-2 focus:ring-blue-500"
                                    value={formUser.role}
                                    onChange={e => setFormUser({ ...formUser, role: e.target.value })}
                                >
                                    <option value="STAFF">STAFF</option>
                                    <option value="FINANCE">FINANCE</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
