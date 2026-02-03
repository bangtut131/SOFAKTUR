import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Testing Date Range Impact ---");

    // Test 1: No date filter (current logic)
    const res1 = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        limit: 1
    });
    console.log("No Date Filter - totalCount:", res1.totalCount);

    // Test 2: Wide date filter
    const res2 = await AccurateServerService.fetchInvoices({
        owingStatus: 'UNPAID',
        fromDate: '01/01/2000',
        limit: 1
    });
    console.log("With Wide Date Filter (from 2000) - totalCount:", res2.totalCount);

    if (res2.invoices && res2.invoices.length > 0) {
        console.log("Sample Invoice from Wide Fetch:", JSON.stringify(res2.invoices[0], null, 2));
    }
}

main();
