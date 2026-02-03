import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Diagnostic: URL Comparison ---");

    for (let p = 1; p <= 2; p++) {
        const params = {
            owingStatus: 'UNPAID',
            fromDate: '01/01/2000',
            toDate: '31/12/2099',
            page: p,
            limit: 100
        };
        // We'll peek into the service or just replicate the URL logic
        console.log(`\nTesting Page ${p}...`);
        const result = await AccurateServerService.fetchInvoices(params as any);
        console.log(`Page ${p} Result: count=${result.invoices?.length}, total=${result.totalCount}`);
    }
}
main();
