"use client";

import Link from "next/link";
import { FolderOpen, Calendar, FileText, Trash2, ExternalLink, FileCheck, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Session {
    id: string;
    periodName: string;
    status: string;
    createdAt: Date;
    _count: { items: number };
}

export default function SessionList({ initialSessions, userRole }: { initialSessions: any[], userRole: string }) {
    const router = useRouter();

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Yakin ingin MENGHAPUS sesi SO "${name}"? \nData yang sudah discan akan hilang permanen.`)) return;

        try {
            const res = await fetch(`/api/so/sessions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Berhasil dihapus.");
                router.refresh();
            } else {
                alert("Gagal menghapus.");
            }
        } catch (e) {
            alert("Error server.");
        }
    }

    if (initialSessions.length === 0) {
        return (
            <div className="p-12 text-center text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p>Belum ada data SO. Klik "Buat Periode Baru" untuk memulai.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100">
            {initialSessions.map((session) => (
                <div key={session.id} className="p-6 hover:bg-blue-50/50 transition flex flex-col md:flex-row justify-between items-start md:items-center group gap-4">
                    <div className="space-y-1 w-full md:w-auto">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition">{session.periodName}</h3>
                            {/* Mobile Status Badge (visible only on small screens if desired, but here we keep layout simple) */}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(session.createdAt).toLocaleDateString('id-ID', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                })}
                            </span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-gray-600">
                                {session._count.items} Faktur
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${session.status === 'OPEN' ? 'bg-green-100 text-green-700 border-green-200' :
                            session.status === 'FINALIZED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }`}>
                            {session.status === 'WAITING_APPROVAL' ? 'WAITING APPROVAL' : session.status}
                        </span>

                        <div className="flex items-center gap-2">
                            {/* Actions based on Role & Status */}

                            {/* STAFF Actions */}
                            {(userRole === 'STAFF' || userRole === 'ADMIN') && session.status === 'OPEN' && (
                                <Link
                                    href={`/so/process/${session.id}`}
                                    className="bg-white border border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2"
                                >
                                    <ExternalLink size={16} /> Scan
                                </Link>
                            )}

                            {/* READ ONLY VIEW for Staff/Admin when NOT OPEN (Covers WAITING, FINALIZED, LOCKED, ADJUSTMENT) */}
                            {session.status !== 'OPEN' && (
                                <Link
                                    href={`/so/adjustment/${session.id}`}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2"
                                >
                                    <FileText size={16} /> Lihat Data
                                </Link>
                            )}

                            {session.status === 'WAITING_APPROVAL' && userRole === 'STAFF' && (
                                <span className="text-gray-400 italic text-sm font-medium px-2">Pending Approval</span>
                            )}

                            {/* FINANCE Actions */}
                            {(userRole === 'FINANCE' || userRole === 'ADMIN') && session.status === 'WAITING_APPROVAL' && (
                                <Link
                                    href={`/so/approval/${session.id}`}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white border border-yellow-600 px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm flex items-center gap-2"
                                >
                                    <FileCheck size={16} /> Review
                                </Link>
                            )}

                            {session.status === 'FINALIZED' && (
                                <span className="text-blue-600 font-bold text-sm px-2 flex gap-1 items-center">
                                    <Lock size={14} /> Finalized
                                </span>
                            )}

                            {/* Delete Button - Open only for Admin/Staff if OPEN */}
                            {(userRole === 'ADMIN' || (userRole === 'STAFF' && session.status === 'OPEN')) && (
                                <button
                                    onClick={() => handleDelete(session.id, session.periodName)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Hapus Data SO"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
