import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { AccurateServerService } from './accurateServer';
import { WahaService } from './waha';

const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    try {
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        if (parts.length === 3) {
            if (dateStr.includes('/')) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    } catch (e) { }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
};

const formatDate = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export const SchedulerService = {
    jobs: {} as Record<string, any>,

    async initScheduler() {
        console.log("Initializing Scheduler...");
        Object.values(this.jobs).forEach(job => job.stop());
        this.jobs = {};
        try {
            const schedules = await prisma.broadcastSchedule.findMany({ where: { isEnabled: true } });
            schedules.forEach(schedule => {
                if (cron.validate(schedule.cronExpression)) {
                    const task = cron.schedule(schedule.cronExpression, async () => {
                        if (schedule.type === 'SYNC') await this.runSyncJob(schedule.id);
                        else if (schedule.type === 'BROADCAST') await this.runBroadcastJob(schedule.id);
                        else if (schedule.type === 'SO_SYNC') await this.runSoSyncJob(schedule.id);
                    });
                    this.jobs[schedule.id] = task;
                }
            });
        } catch (e) { console.error("Scheduler Init Error", e); }
    },

    async updateStatus(message: string, current: number = 0, total: number = 0, status: string = 'RUNNING') {
        try {
            await prisma.systemSetting.upsert({
                where: { key: 'SYNC_PROGRESS_PIUTANG' },
                update: { value: JSON.stringify({ message, current, total, status }) },
                create: { key: 'SYNC_PROGRESS_PIUTANG', value: JSON.stringify({ message, current, total, status }) }
            });
        } catch (e) { }
    },

    async syncCustomers() {
        let page = 1;
        let hasMore = true;
        let totalSynced = 0;
        console.log("[SYNC] Starting Customer Sync...");
        while (hasMore) {
            // Rate limit: 8 req/sec max, use 200ms delay for safety
            await new Promise(resolve => setTimeout(resolve, 200));

            const result = await AccurateServerService.fetchCustomers(page);
            if (!result.customers || result.customers.length === 0) break;
            // Process customers in batches
            const BATCH_SIZE = 20;
            for (let i = 0; i < result.customers.length; i += BATCH_SIZE) {
                const batch = result.customers.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(cust =>
                    prisma.customer.upsert({
                        where: { accurateId: String(cust.id) },
                        update: { name: cust.name, phone: cust.mobilePhone || cust.phone || null, email: cust.email || null, updatedAt: new Date() },
                        create: { accurateId: String(cust.id), name: cust.name, phone: cust.mobilePhone || cust.phone || null, email: cust.email || null }
                    })
                ));
                totalSynced += batch.length;
            }
            console.log(`[SYNC] Synced ${totalSynced} customers (page ${page})...`);
            if (result.customers.length < 100) hasMore = false;
            else page++;
        }
        console.log(`[SYNC] Customer Sync Complete: ${totalSynced} customers.`);
    },

    async runSyncJob(scheduleId?: string): Promise<{ success: boolean; count: number; error?: string }> {
        console.log("Starting Full Sync Job (Multi-Branch Moving Window)...");
        if (scheduleId) await prisma.broadcastSchedule.update({ where: { id: scheduleId }, data: { lastRun: new Date() } });

        try {
            // Phase 1: Sync Customers
            await this.updateStatus("Mengambil data customer...", 0, 0, 'SYNCING_CUSTOMERS');
            await this.syncCustomers();

            // Phase 2: Get branches and count total invoices
            await this.updateStatus("Menghitung total invoice...", 0, 0, 'COUNTING');
            const branches = await AccurateServerService.getBranches();
            console.log(`[SYNC] Got ${branches.length} branches:`, branches.map(b => b.name));

            if (branches.length === 0) {
                console.error("[SYNC] No branches returned! Check Accurate API.");
                await this.updateStatus("Error: No branches found", 0, 0, 'ERROR');
                return { success: false, count: 0, error: "No branches" };
            }

            // Count total invoices across all branches for accurate progress bar
            let grandTotal = 0;
            const branchCounts: { branch: typeof branches[0], count: number }[] = [];

            for (const branch of branches) {
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit
                const count = await AccurateServerService.countUnpaidInvoicesByBranch(String(branch.id));
                branchCounts.push({ branch, count });
                grandTotal += count;
                console.log(`[SYNC] Branch ${branch.name}: ${count} invoices`);
            }

            console.log(`[SYNC] Total invoices to sync: ${grandTotal}`);
            await this.updateStatus(`Total ${grandTotal} invoice di ${branches.length} cabang`, 0, grandTotal, 'SYNCING_INVOICES');

            // Phase 3: Sync invoices per branch with accurate progress
            let totalProcessed = 0;
            let errorCount = 0;
            const maxErrorsPerBranch = 3;

            for (const { branch, count } of branchCounts) {
                console.log(`[SYNC] Starting Branch: ${branch.name} (ID: ${branch.id}) - Expected: ${count} invoices`);
                let page = 1;
                let hasMore = true;
                let branchErrors = 0;

                while (hasMore) {
                    await this.updateStatus(`Sync ${branch.name} (Page ${page})...`, totalProcessed, grandTotal, 'SYNCING_INVOICES');

                    // Rate limit: use 1.5s delay
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    let res: any = null;
                    let retryCount = 0;
                    const maxRetries = 3;

                    // Retry loop for this page
                    while (retryCount < maxRetries) {
                        try {
                            res = await AccurateServerService.fetchInvoices({
                                owingStatus: 'UNPAID',
                                page: page,
                                limit: 100,
                                branchId: String(branch.id)
                            } as any);

                            if (res.error) {
                                console.warn(`[SYNC] API Error for ${branch.name} page ${page}: ${res.error}. Retry ${retryCount + 1}/${maxRetries}`);
                                retryCount++;
                                if (retryCount < maxRetries) {
                                    await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
                                    continue;
                                }
                            }
                            break; // Success or max retries reached
                        } catch (fetchError: any) {
                            console.error(`[SYNC] Fetch exception for ${branch.name} page ${page}:`, fetchError.message);
                            retryCount++;
                            if (retryCount < maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
                            }
                        }
                    }

                    // Handle final result after retries
                    if (!res || res.error) {
                        branchErrors++;
                        errorCount++;
                        console.error(`[SYNC] Failed to fetch ${branch.name} page ${page} after ${maxRetries} retries`);

                        if (branchErrors >= maxErrorsPerBranch) {
                            console.error(`[SYNC] Too many errors for ${branch.name}, skipping remaining pages`);
                            hasMore = false;
                            break;
                        }
                        // Try next page
                        page++;
                        continue;
                    }

                    if (res.invoices && res.invoices.length > 0) {
                        // Optimization: Pre-fetch existing customers to reduce DB calls
                        const uniqueAccurateIds = Array.from(new Set(res.invoices.map((inv: any) => inv.customerAccurateId).filter((id: string) => !!id))) as string[];
                        const existingCustomers = await prisma.customer.findMany({
                            where: { accurateId: { in: uniqueAccurateIds } }
                        });
                        const customerMap = new Map(existingCustomers.map(c => [c.accurateId, c]));

                        // Process in batches to control concurrency
                        const BATCH_SIZE = 20;
                        for (let i = 0; i < res.invoices.length; i += BATCH_SIZE) {
                            const batch = res.invoices.slice(i, i + BATCH_SIZE);

                            await Promise.all(batch.map(async (inv: any) => {
                                try {
                                    let customer = customerMap.get(inv.customerAccurateId);

                                    // Make sure we have the customer (handle missing case)
                                    if (!customer) {
                                        // Double check DB just in case (race condition fallback or find by name)
                                        customer = await prisma.customer.findUnique({ where: { accurateId: inv.customerAccurateId } }) || undefined;
                                        if (!customer) customer = await prisma.customer.findFirst({ where: { name: inv.customerName } }) || undefined;
                                        if (!customer) {
                                            if (inv.customerAccurateId) {
                                                try {
                                                    customer = await prisma.customer.create({
                                                        data: {
                                                            accurateId: inv.customerAccurateId,
                                                            name: inv.customerName
                                                        }
                                                    });
                                                    // Update map to avoid re-creating in this run
                                                    customerMap.set(inv.customerAccurateId, customer);
                                                } catch (createError) {
                                                    // Handle race condition where another thread created it
                                                    customer = await prisma.customer.findUnique({ where: { accurateId: inv.customerAccurateId } }) || undefined;
                                                }
                                            } else {
                                                // Fallback for missing ID
                                                customer = await prisma.customer.create({
                                                    data: {
                                                        accurateId: `TEMP-${Date.now()}-${Math.random()}`,
                                                        name: inv.customerName
                                                    }
                                                });
                                            }
                                        }
                                    }

                                    if (customer) {
                                        await prisma.receivable.upsert({
                                            where: { transNo: inv.transNo },
                                            update: { outstanding: inv.outstanding, amount: inv.amount, lastSyncedAt: new Date(), status: inv.outstanding <= 0 ? 'PAID' : 'OPEN' },
                                            create: {
                                                customerId: customer.id, transNo: inv.transNo,
                                                transDate: parseDate(inv.transDate), dueDate: parseDate(inv.dueDate),
                                                amount: inv.amount, outstanding: inv.outstanding, status: 'OPEN'
                                            }
                                        });
                                        // totalProcessed++; // Atomic increment or just add batch length later? 
                                        // incrementing local variable in promise chain is safe in JS single threaded event loop
                                        totalProcessed++;
                                    }
                                } catch (dbError: any) {
                                    console.error(`[SYNC] DB Error for invoice ${inv.transNo}:`, dbError.message);
                                }
                            }));

                            // Update progress after each batch
                            await this.updateStatus(`Sync ${branch.name} (Page ${page})...`, totalProcessed, grandTotal, 'SYNCING_INVOICES');
                        }

                        console.log(`[SYNC] ${branch.name} Page ${page}: Processed ${res.invoices.length} invoices. Total: ${totalProcessed}`);

                        if (res.invoices.length < 100) {
                            hasMore = false;
                        } else {
                            page++;
                        }
                    } else {
                        console.log(`[SYNC] No more invoices for ${branch.name} (Page ${page}).`);
                        hasMore = false;
                    }
                }
            }

            // Phase 4: Mark stale invoices as PAID
            // Any invoice in DB with status OPEN that wasn't returned by API means it's been paid
            await this.updateStatus(`Memperbarui status lunas...`, totalProcessed, grandTotal, 'MARKING_PAID');
            console.log(`[SYNC] Phase 4: Marking stale invoices as PAID...`);

            const markPaidResult = await prisma.receivable.updateMany({
                where: {
                    status: 'OPEN',
                    outstanding: { gt: 0 },
                    lastSyncedAt: {
                        lt: new Date(Date.now() - 5 * 60 * 1000) // Not synced in last 5 minutes
                    }
                },
                data: {
                    status: 'PAID',
                    outstanding: 0,
                    lastSyncedAt: new Date()
                }
            });

            console.log(`[SYNC] Marked ${markPaidResult.count} stale invoices as PAID`);

            const finalMessage = errorCount > 0
                ? `Selesai dengan ${errorCount} error. ${totalProcessed} invoice diproses, ${markPaidResult.count} ditandai lunas.`
                : `Selesai! ${totalProcessed} invoice, ${markPaidResult.count} ditandai lunas.`;

            await this.updateStatus(finalMessage, totalProcessed, grandTotal, 'IDLE');
            console.log(`[SYNC] Complete: ${totalProcessed} invoices processed, ${markPaidResult.count} marked paid, ${errorCount} errors`);
            return { success: true, count: totalProcessed };
        } catch (error: any) {
            console.error("Sync Job Failed:", error);
            await this.updateStatus("Error: " + error.message, 0, 0, 'ERROR');
            return { success: false, count: 0, error: error.message };
        }
    },

    async runBroadcastJob(scheduleId: string) {
        const schedule = await prisma.broadcastSchedule.findUnique({ where: { id: scheduleId } });
        if (!schedule || !schedule.isEnabled || !schedule.messageTemplate) return;
        await prisma.broadcastSchedule.update({ where: { id: scheduleId }, data: { lastRun: new Date() } });

        const customers = await prisma.customer.findMany({
            where: { NOT: [{ phone: null }, { phone: "" }], receivables: { some: { status: 'OPEN', outstanding: { gt: 0 } } } },
            include: { receivables: { where: { status: 'OPEN', outstanding: { gt: 0 } } } }
        });

        const today = new Date();
        const MS_PER_DAY = 1000 * 60 * 60 * 24;

        for (const cust of customers) {
            // Filter invoices based on schedule settings
            const eligibleReceivables = cust.receivables.filter(r => {
                const daysSinceTrans = Math.floor((today.getTime() - new Date(r.transDate).getTime()) / MS_PER_DAY);
                const daysOverdue = Math.floor((today.getTime() - new Date(r.dueDate).getTime()) / MS_PER_DAY);

                // Check Transaction Date Age
                if (schedule.minDaysSinceTrans && daysSinceTrans < schedule.minDaysSinceTrans) return false;

                // Check Overdue Age
                if (schedule.minDaysOverdue && daysOverdue < schedule.minDaysOverdue) return false;

                return true;
            });

            if (eligibleReceivables.length === 0) continue; // Skip customer if no eligible invoices

            const totalOwing = eligibleReceivables.reduce((sum, inv) => sum + inv.outstanding, 0);
            const invoiceList = eligibleReceivables.map(r => `- ${r.transNo}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(r.outstanding)}`).join('\n');
            let message = schedule.messageTemplate.replace(/{customerName}/g, cust.name).replace(/{totalOwing}/g, new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalOwing)).replace(/{invoiceList}/g, invoiceList);
            const sent = await WahaService.sendText(cust.phone!, message);
            await prisma.broadcastLog.create({
                data: { customerId: cust.id, customerName: cust.name, phone: cust.phone!, message, status: sent.success ? 'SENT' : 'FAILED', error: sent.error || null, source: 'SYSTEM' }
            });
        }
    },

    async runSoSyncJob(scheduleId?: string) {
        console.log("Starting SO Auto Sync Job...");
        if (scheduleId) await prisma.broadcastSchedule.update({ where: { id: scheduleId }, data: { lastRun: new Date() } });

        try {
            const dateStr = formatDate(new Date());
            const periodName = `Auto Sync ${dateStr}`;

            // 1. Create Session
            const session = await prisma.soSession.create({
                data: {
                    periodName,
                    status: 'OPEN',
                    totalItems: 0,
                    totalValue: 0
                }
            });
            console.log(`[SO SYNC] Created Session: ${periodName} (${session.id})`);

            // 2. Fetch Invoices from Accurate (Unpaid Only)
            let page = 1;
            let hasMore = true;
            let totalItems = 0;
            let totalValue = 0;

            while (hasMore) {
                // Rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));

                const result = await AccurateServerService.fetchInvoices({
                    owingStatus: 'UNPAID',
                    page,
                    limit: 100
                }) as any;

                if (result.error) {
                    console.error(`[SO SYNC] Error fetching page ${page}: ${result.error}`);
                    break;
                }

                const invoices = result.invoices || [];
                if (invoices.length === 0) {
                    hasMore = false;
                    break;
                }

                // 3. Save to DB
                // Prepare data
                const itemsData = invoices.map((inv: any) => ({
                    sessionId: session.id,
                    transNo: inv.transNo,
                    transDate: inv.transDate,
                    dueDate: inv.dueDate,
                    customerName: inv.customerName,
                    description: inv.description,
                    statusName: inv.statusName,
                    approvalStatus: inv.approvalStatus,
                    amount: inv.amount,
                    outstanding: inv.outstanding,
                    primeOwing: inv.primeOwing,
                    status: 'UNVERIFIED'
                }));

                await prisma.soItem.createMany({ data: itemsData });

                // Accumulate stats
                totalItems += invoices.length;
                totalValue += invoices.reduce((sum: number, item: any) => sum + (Number(item.primeOwing) || 0), 0);

                console.log(`[SO SYNC] Processed page ${page}: ${invoices.length} invoices`);

                if (invoices.length < 100) hasMore = false;
                else page++;
            }

            // 4. Update Session Stats
            await prisma.soSession.update({
                where: { id: session.id },
                data: {
                    totalItems,
                    totalValue
                }
            });

            console.log(`[SO SYNC] Completed. Total Items: ${totalItems}, Total Value: ${totalValue}`);

        } catch (e: any) {
            console.error("SO Sync Job Failed:", e.message);
        }
    }
};
