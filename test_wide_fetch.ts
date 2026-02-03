import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Detailed Date Range Test ---");

    const token = process.env.ACCURATE_API_TOKEN;
    const dbId = process.env.ACCURATE_DB_ID;

    console.log("Using DB ID:", dbId);

    try {
        const res = await AccurateServerService.fetchInvoices({
            owingStatus: 'UNPAID',
            fromDate: '01/01/2000',
            toDate: '31/12/2026',
            limit: 10
        });

        if (res.error) {
            console.error("API Error:", res.error);
        } else {
            console.log("Wide Fetch result:");
            console.log("Invoices count:", res.invoices?.length);
            console.log("totalCount from helper:", res.totalCount);
            console.log("Raw count:", res.rawCount);

            if (res.invoices && res.invoices.length > 0) {
                const totalPage1 = res.invoices.reduce((sum, inv) => sum + inv.primeOwing, 0);
                console.log("Sum of first 10 invoices:", totalPage1);
                console.log("Sample Invoice Date:", res.invoices[0].transDate);
            }
        }
    } catch (e) {
        console.error("Script Exception:", e);
    }
}

main();
