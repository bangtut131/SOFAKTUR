"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    LogOut, Smartphone, Plus, Settings, ClipboardList,
    TrendingDown, QrCode, FolderOpen, Menu, X, ChevronRight
} from "lucide-react";

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    color: string;
}

export default function Sidebar({ username, role }: { username: string; role: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        router.push('/login');
        router.refresh();
    };

    const menuItems: NavItem[] = [
        { href: '/dashboard', label: 'Stock Opname', icon: <FolderOpen size={18} />, color: 'text-blue-500' },
        { href: '/piutang', label: 'Piutang', icon: <Smartphone size={18} />, color: 'text-emerald-500' },
        { href: '/faktur-absensi', label: 'Absensi Faktur', icon: <ClipboardList size={18} />, color: 'text-orange-500' },
        { href: '/cetak-qr', label: 'Cetak QR', icon: <QrCode size={18} />, color: 'text-purple-500' },
        { href: '/monitor-return', label: 'Monitor Return', icon: <TrendingDown size={18} />, color: 'text-red-500' },
    ];

    const actionItems: NavItem[] = [
        { href: '/so/release', label: 'Buat Periode Baru', icon: <Plus size={18} strokeWidth={3} />, color: 'text-blue-600' },
    ];

    const isActive = (href: string) => pathname === href;

    const NavLink = ({ item }: { item: NavItem }) => (
        <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${isActive(item.href)
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            <span className={isActive(item.href) ? 'text-blue-600' : item.color}>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {isActive(item.href) && <ChevronRight size={14} className="text-blue-400" />}
        </Link>
    );

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo & App Name */}
            <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="h-9 w-auto" />
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-gray-800 tracking-tight leading-tight">Invoice</h1>
                        <h1 className="text-sm font-bold text-gray-800 tracking-tight leading-tight">Stock Opname</h1>
                    </div>
                </div>
            </div>

            {/* User Info */}
            <div className="px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 uppercase">{username.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate uppercase">{username}</p>
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{role}</span>
                    </div>
                </div>
            </div>

            {/* Main Menu */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
                {menuItems.map(item => (
                    <NavLink key={item.href} item={item} />
                ))}

                {(role === 'ADMIN' || role === 'STAFF') && (
                    <>
                        <div className="my-3 border-t border-gray-100" />
                        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Aksi</p>
                        {actionItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </>
                )}
            </div>

            {/* Footer: Settings & Logout */}
            <div className="border-t border-gray-100 px-3 py-3 space-y-1">
                {role === 'ADMIN' && (
                    <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${isActive('/settings')
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                    >
                        <Settings size={18} />
                        <span>Pengaturan</span>
                    </Link>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition w-full"
                >
                    <LogOut size={18} />
                    <span>Keluar</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 bg-white border-r border-gray-200 z-30">
                {sidebarContent}
            </aside>

            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center px-4 gap-3">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                    <Menu size={22} className="text-gray-700" />
                </button>
                <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
                <span className="text-sm font-bold text-gray-800">Invoice SO</span>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex">
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-64 bg-white shadow-xl animate-slide-in">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
}
