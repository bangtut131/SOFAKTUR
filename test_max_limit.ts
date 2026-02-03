import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Test: pageSize 400 ---");
    const res = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        fromDate: '01/01/2000',
        toDate: '31/12/2099',
        page: 1,
        limit: 400
    } as any);
    console.log(`pageSize=400: returned=${res.invoices?.length}, totalCount=${res.totalCount}`);

    console.log("\n--- Test: pageSize 300 ---");
    const res300 = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        fromDate: '01/01/2000',
        toDate: '31/12/2099',
        page: 1,
        limit: 300
    } as any);
    console.log(`pageSize=300: returned=${res300.invoices?.length}, totalCount=${res300.totalCount}`);
}
main();
