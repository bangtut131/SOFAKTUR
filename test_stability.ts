import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Test: GREATER_EQUAL_THAN vs BETWEEN Pagination ---");

    console.log("\n[Testing BETWEEN]");
    for (let p = 1; p <= 2; p++) {
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            fromDate: '01/01/2000',
            toDate: '31/12/2099',
            page: p,
            limit: 100
        } as any);
        console.log(`Page ${p}: length=${res.invoices?.length}, totalCount=${res.totalCount}`);
    }

    console.log("\n[Testing GREATER_EQUAL_THAN (No toDate)]");
    for (let p = 1; p <= 2; p++) {
        // We need to modify AccurateServerService to use GREATER_EQUAL_THAN if only fromDate is present
        // But for now, let's see what happens if we only pass fromDate to the Current service
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            fromDate: '01/01/2000',
            page: p,
            limit: 100
        } as any);
        console.log(`Page ${p}: length=${res.invoices?.length}, totalCount=${res.totalCount}`);
    }
}
main();
