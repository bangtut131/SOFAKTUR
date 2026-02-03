import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Test: pageSize 200 Pagination ---");
    const dates = { fromDate: '01/01/2000', toDate: '31/12/2099' };

    for (let p = 1; p <= 3; p++) {
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            ...dates,
            page: p,
            limit: 200
        } as any);
        console.log(`Page ${p}: length=${res.invoices?.length}, totalCount=${res.totalCount}`);
    }
}
main();
