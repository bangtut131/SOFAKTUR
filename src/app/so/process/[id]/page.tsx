import { prisma } from "@/lib/prisma";
import ScannerInterface from '@/components/ScannerInterface';
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ProcessSOPage({ params }: { params: { id: string } }) {
    const session = await prisma.soSession.findUnique({
        where: { id: params.id },
        include: {
            items: {
                orderBy: { transDate: 'desc' }
            }
        }
    });

    if (!session) {
        notFound();
    }

    // Convert Date objects to strings if needed or pass as is (Client component handles Date?)
    // Prisma returns Date objects. Client components params must be serializable.
    // So we map items.
    const serializableItems = session.items.map(item => ({
        ...item,
        scannedAt: item.scannedAt ? item.scannedAt.toISOString() : null
    }));

    return (
        <ScannerInterface
            sessionId={session.id}
            periodName={session.periodName}
            initialItems={serializableItems}
        />
    );
}
