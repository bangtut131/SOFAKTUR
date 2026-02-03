import { Invoice } from "@/types";

export interface FilterOptions {
    owingStatus: 'PAID' | 'UNPAID' | 'ALL';
    fromDate: string;
    toDate: string;
    accurateStatus: string;
}

export const AccurateService = {
    async fetchOutstandingInvoices(filters: FilterOptions, onProgress?: (count: number) => void): Promise<Invoice[]> {
        console.log("Starting bulk fetch with filters:", filters);
        let allInvoices: Invoice[] = [];
        let page = 1;
        let hasMore = true;

        // Construct Query String
        const params = new URLSearchParams();
        params.append('owingStatus', filters.owingStatus);
        if (filters.fromDate) params.append('fromDate', filters.fromDate);
        if (filters.toDate) params.append('toDate', filters.toDate);
        if (filters.accurateStatus) params.append('accurateStatus', filters.accurateStatus);

        while (hasMore) {
            try {
                params.set('page', page.toString());
                const res = await fetch(`/api/invoices?${params.toString()}`);
                if (!res.ok) break;

                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) {
                    hasMore = false;
                } else {
                    allInvoices = [...allInvoices, ...data];
                    if (onProgress) onProgress(allInvoices.length);
                    page++;
                }
            } catch (e) {
                console.error("Fetch error at page " + page, e);
                hasMore = false;
            }
        }

        console.log(`Total loaded: ${allInvoices.length}`);
        return allInvoices;
    },
};
