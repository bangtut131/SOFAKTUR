import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Test: High pageSize ---");

    const sizes = [100, 200, 500, 1000, 2500];
    for (const size of sizes) {
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            fromDate: '01/01/2000',
            toDate: '31/12/2099',
            page: 1,
            limit: size
        } as any);
        console.log(`pageSize=${size}: returned=${res.invoices?.length}, totalCount=${res.totalCount}`);
    }
}
main();
