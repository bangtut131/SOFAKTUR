import { prisma } from "@/lib/prisma";
import SessionList from "@/components/SessionList";
import { FolderOpen } from "lucide-react";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
    const cookieStore = await cookies();
    const role = cookieStore.get('user_role')?.value || 'STAFF';
    const username = cookieStore.get('username')?.value || 'User';

    // Fetch Sessions directly from DB
    const sessions = await prisma.soSession.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: { select: { items: true } }
        }
    });

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <Sidebar username={username} role={role} />

            {/* Main content — shifted right on desktop, shifted down on mobile */}
            <main className="md:ml-56 pt-16 md:pt-0 min-h-screen">
                <div className="max-w-5xl mx-auto p-6 space-y-6">

                    {/* Page Title */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                        <p className="text-sm text-gray-500 mt-1">Selamat datang, <span className="font-semibold text-blue-600 uppercase">{username}</span></p>
                    </div>

                    {/* Session List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FolderOpen className="text-blue-500" />
                                Riwayat Stock Opname
                            </h2>
                        </div>
                        <SessionList initialSessions={sessions} userRole={role} />
                    </div>

                </div>
            </main>
        </div>
    );
}
