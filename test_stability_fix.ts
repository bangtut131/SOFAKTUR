import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Test: GREATER_EQUAL_THAN Stability ---");
    // Ensure we have a way to force GREATER_EQUAL_THAN
    // I will mock the params so fetchInvoices uses ONLY fromDate

    for (let p = 1; p <= 3; p++) {
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            fromDate: '01/01/2000',
            // NO toDate here
            page: p,
            limit: 100
        } as any);
        console.log(`Page ${p}: length=${res.invoices?.length}`);
    }
}
main();
