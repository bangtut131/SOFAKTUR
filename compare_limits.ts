import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Comparison: Limit 100 vs 5000 with Dates ---");
    const dates = { fromDate: '01/01/2000', toDate: '31/12/2099' };

    const res100 = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        ...dates,
        page: 1,
        limit: 100
    } as any);
    console.log("Limit 100 - totalCount:", res100.totalCount);
    console.log("Limit 100 - invoices length:", res100.invoices?.length);

    const res5000 = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        ...dates,
        page: 1,
        limit: 5000
    } as any);
    console.log("Limit 5000 - totalCount:", res5000.totalCount);
    console.log("Limit 5000 - invoices length:", res5000.invoices?.length);
}
main();
