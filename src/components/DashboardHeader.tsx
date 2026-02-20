"use client";

import { LogOut, Smartphone, Plus, Settings, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardHeader({ username, role }: { username: string, role: string }) {
    const router = useRouter();

    const handleLogout = () => {
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        router.push('/login');
        router.refresh();
    };

    return (
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
                <div>
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">Invoice Stock Opname</h1>
                    <div className="text-xs font-semibold text-gray-500">
                        Logged as: <span className="text-blue-600 uppercase">{username}</span> <span className="text-gray-400">|</span> <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{role}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {/* Create Button only for Admin/Staff */}
                {(role === 'ADMIN' || role === 'STAFF') && (
                    <>
                        <Link
                            href="/piutang"
                            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-blue-600 px-4 h-10 rounded-lg font-semibold transition shadow-sm text-sm"
                        >
                            <Smartphone size={16} />
                            Piutang
                        </Link>
                        <Link
                            href="/faktur-absensi"
                            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-orange-600 px-4 h-10 rounded-lg font-semibold transition shadow-sm text-sm"
                        >
                            <ClipboardList size={16} />
                            Absensi Faktur
                        </Link>
                        <Link
                            href="/so/release"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 h-10 rounded-lg font-semibold transition shadow-md hover:shadow-lg active:scale-95 text-sm"
                        >
                            <Plus size={16} strokeWidth={3} />
                            Buat Periode Baru
                        </Link>
                    </>
                )}

                {role === 'ADMIN' && (
                    <Link
                        href="/settings"
                        className="flex items-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200 px-4 h-10 rounded-lg font-semibold transition text-sm"
                    >
                        <Settings size={18} />
                    </Link>
                )}

                <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 h-10 w-10 rounded-lg transition"
                    title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
