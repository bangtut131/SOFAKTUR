import { prisma } from "@/lib/prisma";
import SessionList from "@/components/SessionList";
import { FolderOpen } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
    const cookieStore = cookies();
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
        <main className="min-h-screen bg-gray-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header Client Component */}
                <DashboardHeader username={username} role={role} />

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
    );
}
