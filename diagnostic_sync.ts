import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Diagnostic: fetchInvoices with Scheduler Params ---");
    const params = {
        owingStatus: 'UNPAID',
        fromDate: '01/01/2000',
        toDate: '31/12/2099',
        page: 1,
        limit: 100
    };
    console.log("Params:", JSON.stringify(params, null, 2));

    const result = await AccurateServerService.fetchInvoices(params as any);
    console.log("Result totalCount:", result.totalCount);
    console.log("Result invoices length:", result.invoices?.length);

    if (result.invoices && result.invoices.length > 0) {
        console.log("First invoice date:", result.invoices[0].transDate);
    }
}
main();
