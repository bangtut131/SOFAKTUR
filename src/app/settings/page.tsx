"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Shield, Key, Save, Trash2, Plus, Edit } from "lucide-react";

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

export default function SettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('USERS');

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

    useEffect(() => {
        fetchUsers();
        fetchSettings();
    }, []);

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
