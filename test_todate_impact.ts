import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Test: toDate Impact ---");

    // Test 1: fromDate only
    const res1 = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        fromDate: '01/01/2000',
        limit: 1
    });
    console.log("Test 1 (fromDate only) - totalCount:", res1.totalCount);

    // Test 2: both fromDate and toDate
    const res2 = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        fromDate: '01/01/2000',
        toDate: '31/12/2026',
        limit: 10
    });
    console.log("Test 2 (both dates) - totalCount:", res2.totalCount);
}

main();
