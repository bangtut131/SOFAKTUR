import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Diagnostic: Pagination with Filters ---");

    for (let p = 1; p <= 3; p++) {
        const params = {
            owingStatus: 'UNPAID',
            fromDate: '01/01/2000',
            toDate: '31/12/2099',
            page: p,
            limit: 100
        };
        const result = await AccurateServerService.fetchInvoices(params as any);
        console.log(`Page ${p}: length=${result.invoices?.length}, totalCount=${result.totalCount}`);
    }
}
main();
