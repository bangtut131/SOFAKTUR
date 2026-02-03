"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PiutangLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/piutang/logs')
            .then(res => res.json())
            .then(data => setLogs(data.logs || []))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 shadow-sm border-b shrink-0 flex items-center gap-4">
                <button onClick={() => router.push('/piutang')} className="p-2 bg-white text-gray-800 border border-gray-200 rounded-full hover:bg-gray-100 shadow-sm transition">
                    <ArrowLeft />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Riwayat Broadcast</h1>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-auto">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-500 border-b">
                            <tr>
                                <th className="p-4">Waktu</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">No. Tujuan</th>
                                <th className="p-4">Pesan</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Belum ada riwayat.</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-500 text-xs">
                                            {new Date(log.sentAt).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">{log.customerName}</td>
                                        <td className="p-4 text-gray-600">{log.phone}</td>
                                        <td className="p-4 text-gray-600 max-w-xs truncate" title={log.message}>
                                            {log.message}
                                        </td>
                                        <td className="p-4">
                                            {log.status === 'SENT' ? (
                                                <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
                                                    <CheckCircle size={12} /> SENT
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold" title={log.error}>
                                                    <AlertTriangle size={12} /> FAILED
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
