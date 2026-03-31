import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WahaService } from '@/services/waha';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { recipients, template, delay = 5000, deviceSessionIds = [] } = await req.json();

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return new Response(JSON.stringify({ error: 'recipients required' }), { status: 400 });
        }
        if (!template) {
            return new Response(JSON.stringify({ error: 'template required' }), { status: 400 });
        }

        // Clamp delay between 3s and 15s for safety
        const safeDelay = Math.max(3000, Math.min(15000, delay));

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const send = (data: any) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                let sentCount = 0;
                let failCount = 0;
                const total = recipients.length;

                // Device session IDs for round-robin
                const sessions: string[] = deviceSessionIds.length > 0 ? deviceSessionIds : [];

                send({ type: 'START', total, devices: sessions.length || 1 });

                for (let i = 0; i < recipients.length; i++) {
                    const r = recipients[i];

                    // Round-robin device selection
                    const sessionOverride = sessions.length > 0 ? sessions[i % sessions.length] : undefined;

                    // Build message from template
                    const totalOwing = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(r.totalOwing || 0);
                    const invoiceList = (r.invoices || [])
                        .map((inv: any) => `- ${inv.transNo}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.outstanding)}`)
                        .join('\n');
                    const invoiceCount = r.invoiceCount || (r.invoices?.length || 0);

                    let message = template
                        .replace(/{customerName}/g, r.name || '')
                        .replace(/{totalOwing}/g, totalOwing)
                        .replace(/{invoiceList}/g, invoiceList)
                        .replace(/{invoiceCount}/g, String(invoiceCount));

                    const phone = r.phone?.replace(/\D/g, '') || '';

                    if (!phone) {
                        failCount++;
                        const logEntry = await prisma.broadcastLog.create({
                            data: {
                                customerId: r.id || 'manual',
                                customerName: r.name || 'Unknown',
                                phone: r.phone || '-',
                                message,
                                status: 'FAILED',
                                error: 'Nomor HP kosong',
                                source: 'MANUAL',
                            },
                        });
                        send({ type: 'RESULT', index: i, name: r.name, phone: r.phone || '-', status: 'FAILED', error: 'Nomor HP kosong', sent: sentCount, failed: failCount, total });
                        continue;
                    }

                    try {
                        const result = await WahaService.sendText(phone, message, sessionOverride);

                        if (result.success) {
                            sentCount++;
                            await prisma.broadcastLog.create({
                                data: {
                                    customerId: r.id || 'manual',
                                    customerName: r.name || 'Unknown',
                                    phone,
                                    message,
                                    status: 'SENT',
                                    source: 'MANUAL',
                                },
                            });
                            send({ type: 'RESULT', index: i, name: r.name, phone, status: 'SENT', sent: sentCount, failed: failCount, total });
                        } else {
                            failCount++;
                            await prisma.broadcastLog.create({
                                data: {
                                    customerId: r.id || 'manual',
                                    customerName: r.name || 'Unknown',
                                    phone,
                                    message,
                                    status: 'FAILED',
                                    error: result.error || 'Unknown error',
                                    source: 'MANUAL',
                                },
                            });
                            send({ type: 'RESULT', index: i, name: r.name, phone, status: 'FAILED', error: result.error, sent: sentCount, failed: failCount, total });
                        }
                    } catch (sendError: any) {
                        failCount++;
                        send({ type: 'RESULT', index: i, name: r.name, phone, status: 'FAILED', error: sendError.message, sent: sentCount, failed: failCount, total });
                    }

                    // Delay between messages (skip delay on last message)
                    if (i < recipients.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, safeDelay));
                    }
                }

                send({ type: 'DONE', sent: sentCount, failed: failCount, total });
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('Send broadcast error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
