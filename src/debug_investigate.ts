import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { AccurateServerService } from './services/accurateServer';
import fs from 'fs';

const prisma = new PrismaClient();

async function investigateMissingCustomer() {
    let output = "=== INVESTIGATE MISSING CUSTOMER ===\n";
    output += `Timestamp: ${new Date().toISOString()}\n\n`;

    try {
        // 1. Check if customer exists in DB
        output += "--- DATABASE SEARCH ---\n";
        const dbCustomer = await prisma.customer.findFirst({
            where: {
                name: { contains: 'Abadi Prima' }
            },
            include: {
                receivables: true
            }
        });

        if (dbCustomer) {
            output += `Found in DB: ${dbCustomer.name}\n`;
            output += `  AccurateID: ${dbCustomer.accurateId}\n`;
            output += `  Phone: ${dbCustomer.phone || 'N/A'}\n`;
            output += `  Receivables count: ${dbCustomer.receivables.length}\n`;
            const totalOwing = dbCustomer.receivables.reduce((sum, r) => sum + r.outstanding, 0);
            output += `  Total Outstanding: Rp ${totalOwing.toLocaleString('id-ID')}\n`;
            dbCustomer.receivables.forEach(r => {
                output += `    - ${r.transNo}: Rp ${r.outstanding.toLocaleString('id-ID')} (${r.status})\n`;
            });
        } else {
            output += "NOT FOUND in database!\n";
        }

        // 2. Get current DB stats
        output += "\n--- CURRENT DB STATS ---\n";
        const totalOutstanding = await prisma.receivable.aggregate({
            _sum: { outstanding: true },
            where: { status: 'OPEN', outstanding: { gt: 0 } }
        });
        output += `Total Outstanding in DB: Rp ${(totalOutstanding._sum.outstanding || 0).toLocaleString('id-ID')}\n`;

        const openCount = await prisma.receivable.count({
            where: { status: 'OPEN', outstanding: { gt: 0 } }
        });
        output += `Open Receivables: ${openCount}\n`;

        const custCount = await prisma.customer.count({
            where: { receivables: { some: { status: 'OPEN', outstanding: { gt: 0 } } } }
        });
        output += `Customers with Open Receivables: ${custCount}\n`;

        // 3. Search in Accurate API
        output += "\n--- ACCURATE API SEARCH ---\n";
        const branches = await AccurateServerService.getBranches();
        output += `Branches: ${branches.length}\n`;

        for (const branch of branches) {
            output += `\nBranch: ${branch.name}\n`;
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fetch page 1 and search for the customer
            const res = await AccurateServerService.fetchInvoices({
                owingStatus: 'UNPAID',
                page: 1,
                limit: 100,
                branchId: String(branch.id)
            } as any);

            if (res.invoices) {
                const found = res.invoices.filter((inv: any) =>
                    inv.customerName.toLowerCase().includes('abadi prima')
                );
                if (found.length > 0) {
                    output += `  FOUND ${found.length} invoices for Abadi Prima:\n`;
                    found.forEach((inv: any) => {
                        output += `    - ${inv.transNo}: ${inv.customerName} - Rp ${inv.outstanding.toLocaleString('id-ID')}\n`;
                    });
                } else {
                    output += `  No Abadi Prima in page 1 (${res.invoices.length} invoices)\n`;
                }
            }
        }

        // 4. Calculate total from API (all pages)
        output += "\n--- FULL API TOTAL (All Pages) ---\n";
        let apiTotal = 0;
        let apiInvoiceCount = 0;

        for (const branch of branches) {
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 1500));

                const res = await AccurateServerService.fetchInvoices({
                    owingStatus: 'UNPAID',
                    page: page,
                    limit: 100,
                    branchId: String(branch.id)
                } as any);

                if (res.invoices && res.invoices.length > 0) {
                    const pageAmount = res.invoices.reduce((sum: number, inv: any) => sum + inv.outstanding, 0);
                    apiTotal += pageAmount;
                    apiInvoiceCount += res.invoices.length;

                    // Check for Abadi Prima
                    const found = res.invoices.filter((inv: any) =>
                        inv.customerName.toLowerCase().includes('abadi prima')
                    );
                    if (found.length > 0) {
                        output += `  Branch ${branch.name} Page ${page}: Found Abadi Prima!\n`;
                        found.forEach((inv: any) => {
                            output += `    - ${inv.transNo}: Rp ${inv.outstanding.toLocaleString('id-ID')}\n`;
                        });
                    }

                    if (res.invoices.length < 100) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }
        }

        output += `\nAPI Total Invoices: ${apiInvoiceCount}\n`;
        output += `API Total Outstanding: Rp ${apiTotal.toLocaleString('id-ID')}\n`;

    } catch (e: any) {
        output += `\nERROR: ${e.message}\n`;
        output += e.stack;
    } finally {
        await prisma.$disconnect();
    }

    fs.writeFileSync('investigate_customer.txt', output, 'utf8');
    console.log("Written to investigate_customer.txt");
    console.log(output);
}

investigateMissingCustomer();
