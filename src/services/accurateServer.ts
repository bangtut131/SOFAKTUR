import crypto from 'crypto';
import { URL } from 'url';
import fs from 'fs';

interface AccurateInvoice {
    id: string;
    transDate: string;
    transNo: string;
    customerName: string;
    customerAccurateId: string;
    description: string;
    amount: number;
    outstanding: number;
    primeOwing: number;
    dueDate: string;
    statusName: string;
    approvalStatus: string;
}

export const AccurateServerService = {
    async fetchInvoices(filters: {
        owingStatus?: string | null,
        fromDate?: string | null,
        toDate?: string | null,
        accurateStatus?: string | null,
        branchId?: string | null,
        page?: number, // Changed to number
        limit?: number // Changed to number
    }): Promise<{ invoices: AccurateInvoice[], error?: string, rawCount?: number, totalCount?: number }> { // Added totalCount

        const token = process.env.ACCURATE_API_TOKEN;
        const dbId = process.env.ACCURATE_DB_ID;
        const host = process.env.ACCURATE_API_HOST;
        const secret = process.env.ACCURATE_APP_SECRET;

        if (!token || !dbId || !host || !secret) {
            return { invoices: [], error: 'Config Error' };
        }






        const url = new URL(`${host}/sales-invoice/list.do`);
        // Fields for List (+ branch for filtering)
        url.searchParams.append('fields', 'id,number,customer,totalAmount,primeOwing,outstanding,transDate,dueDate,description,statusName,approvalStatus,suspended,branch');

        // 1. Payment Status Filter (API Level)
        if (filters.owingStatus === 'PAID') {
            url.searchParams.append('filter.primeOwing.op', 'EQUAL');
            url.searchParams.append('filter.primeOwing.val', '0');
        } else if (filters.owingStatus === 'UNPAID') {
            url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
            url.searchParams.append('filter.primeOwing.val', '0');
        }


        console.log("Accurate Service Filters:", filters);

        // 2. Date Range Filter
        // Accurate API expects DD/MM/YYYY format
        const formatDate = (d: string) => {
            if (!d) return '';
            // If already DD/MM/YYYY (contains /), return as-is
            if (d.includes('/')) return d;
            // Convert YYYY-MM-DD to DD/MM/YYYY
            if (d.includes('-')) {
                const [y, m, dIn] = d.split('-');
                return `${dIn}/${m}/${y}`;
            }
            return d;
        };


        if (filters.fromDate && filters.toDate) {
            url.searchParams.append('filter.transDate.op', 'GREATER_EQUAL_THAN');
            url.searchParams.append('filter.transDate.val', formatDate(filters.fromDate));

            // Fix: Extend toDate by 1 day to ensure we capture invoices created late in the day (if API cuts off at 00:00)
            // The strict JS filter below will ensure we still only return the requested range.
            try {
                const [y, m, d] = filters.toDate.split('-').map(Number);
                const nextDay = new Date(y, m - 1, d);
                nextDay.setDate(nextDay.getDate() + 1);

                const nextDayStr = `${nextDay.getDate().toString().padStart(2, '0')}/${(nextDay.getMonth() + 1).toString().padStart(2, '0')}/${nextDay.getFullYear()}`;

                url.searchParams.append('filter.transDate.op', 'LESS_EQUAL_THAN');
                url.searchParams.append('filter.transDate.val', nextDayStr);
            } catch (e) {
                // Fallback
                url.searchParams.append('filter.transDate.op', 'LESS_EQUAL_THAN');
                url.searchParams.append('filter.transDate.val', formatDate(filters.toDate));
            }

        } else if (filters.fromDate) {
            url.searchParams.append('filter.transDate.op', 'GREATER_EQUAL_THAN');
            url.searchParams.append('filter.transDate.val', formatDate(filters.fromDate));
        } else if (filters.toDate) {
            url.searchParams.append('filter.transDate.op', 'LESS_EQUAL_THAN');
            url.searchParams.append('filter.transDate.val', formatDate(filters.toDate));
        }

        // 3. Accurate Status Filter
        if (filters.accurateStatus) {
            url.searchParams.append('filter.statusName.op', 'CONTAIN');
            url.searchParams.append('filter.statusName.val', filters.accurateStatus);
        }

        // 4. Branch Filter
        if (filters.branchId) {
            url.searchParams.append('filter.branch.id.op', 'EQUAL');
            url.searchParams.append('filter.branch.id.val', filters.branchId);
        }

        // Pagination
        url.searchParams.append('sp.page', String(filters.page || 1));
        url.searchParams.append('sp.pageSize', String(filters.limit || 100));

        // Respect provided sort or default to transDate|desc
        const sortVal = (filters as any).sort || 'transDate|desc';
        url.searchParams.append('sp.sort', sortVal);

        try {
            const timestamp = new Date().toISOString();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(timestamp);
            const signature = hmac.digest('base64');

            // Debug URL (Masking secrets)
            // const debugUrl = new URL(url.toString());
            // console.log("Accurate API Request:", debugUrl.search);

            let response: Response | undefined;
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries) {
                response = await fetch(url.toString(), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Session-ID': dbId,
                        'X-Api-Timestamp': timestamp,
                        'X-Api-Signature': signature
                    },
                });

                if (response.status === 429) {
                    // Rate limited - wait and retry
                    const waitTime = Math.pow(2, retries) * 2000; // 2s, 4s, 8s
                    console.warn(`[API] Rate limited (429). Waiting ${waitTime}ms before retry ${retries + 1}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retries++;
                    continue;
                }

                if (!response.ok) {
                    const txt = await response.text();
                    console.error(`[API] Error ${response.status}: ${txt}`);
                    return { invoices: [], error: `HTTP ${response.status}: ${txt}` };
                }

                break; // Success
            }

            if (retries >= maxRetries || !response) {
                console.error("[API] Max retries exceeded due to rate limiting.");
                return { invoices: [], error: "Rate limit exceeded after retries" };
            }

            const data = await response.json();
            const result = data; // Simulate result from makeRequest for the debug block

            if (!result || !result.d) return { invoices: [], rawCount: 0 };

            let invoices = (result.d || [])
                .filter((item: any) => item && (item.id || item.number))
                .map((item: any) => ({
                    id: item.id ? String(item.id) : `TEMP-${Math.random()}`,
                    transNo: item.number || '',
                    transDate: item.transDate || '', // Format dd/MM/yyyy
                    customerName: item.customer && item.customer.name ? item.customer.name : 'Unknown',
                    customerAccurateId: item.customer?.id ? String(item.customer.id) : '',
                    amount: item.totalAmount || 0,
                    // Accurate uses 'primeOwing' for outstanding amount
                    outstanding: Number(item.primeOwing) || item.outstanding || 0,
                    primeOwing: Number(item.primeOwing) || 0,
                    status: 'UNVERIFIED',
                    dueDate: item.dueDate || '',

                    description: item.description || '',
                    statusName: item.statusName || '',
                    approvalStatus: item.approvalStatus || '',
                    suspended: item.suspended || false,
                    branchName: item.branch && item.branch.name ? item.branch.name : 'Unknown',
                    branchId: item.branch && item.branch.id ? String(item.branch.id) : ''
                }));

            console.log(`[ACCURATE SERVICE] Raw data from API: ${(result.d || []).length} items`);

            // Safety Filter (JS Level)
            const beforeOwingFilter = invoices.length;
            if (filters.owingStatus === 'PAID') {
                invoices = invoices.filter((i: any) => i.primeOwing === 0);
            } else if (filters.owingStatus === 'UNPAID') {
                invoices = invoices.filter((i: any) => i.primeOwing > 0);
            }
            console.log(`[ACCURATE SERVICE] After owingStatus filter: ${invoices.length} (removed ${beforeOwingFilter - invoices.length})`);

            // Branch Filter (JS Level - Force)
            if (filters.branchId) {
                const beforeBranchFilter = invoices.length;
                // Debug: show sample branchIds
                if (invoices.length > 0) {
                    console.log(`[ACCURATE SERVICE] Sample branchIds in data: ${invoices.slice(0, 3).map((i: any) => `${i.branchId}(${typeof i.branchId})`).join(', ')}`);
                    console.log(`[ACCURATE SERVICE] Filtering for branchId: ${filters.branchId}(${typeof filters.branchId})`);
                }
                invoices = invoices.filter((i: any) => String(i.branchId) === String(filters.branchId));
                console.log(`[ACCURATE SERVICE] After branch filter: ${invoices.length} (removed ${beforeBranchFilter - invoices.length})`);
            }

            // Strict JS Date Filter (Fix for API returning full month)
            if (filters.fromDate && filters.toDate) {
                // Formatting to YYYYMMDD integer for safe comparison
                const toIntDate = (dString: string) => {
                    // Input: dd/MM/yyyy
                    if (!dString) return 0;
                    const [d, m, y] = dString.split('/').map(s => s.padStart(2, '0'));
                    return parseInt(`${y}${m}${d}`);
                };

                const toIntInput = (isoString: string) => {
                    // Input: yyyy-mm-dd
                    if (!isoString) return 0;
                    const [y, m, d] = isoString.split('-').map(s => s.padStart(2, '0'));
                    return parseInt(`${y}${m}${d}`);
                }

                const start = toIntInput(filters.fromDate);
                const end = toIntInput(filters.toDate);

                invoices = invoices.filter((i: any) => {
                    const itemDate = toIntDate(i.transDate);
                    return itemDate >= start && itemDate <= end;
                });
            }

            return {
                invoices,
                rawCount: (data.d || []).length,
                totalCount: data.sp?.totalCount || 0
            };

        } catch (e: any) {
            return { invoices: [], error: e.message };
        }
    },

    async getBranches(): Promise<{ id: string, name: string }[]> {
        const token = process.env.ACCURATE_API_TOKEN;
        const dbId = process.env.ACCURATE_DB_ID;
        const host = process.env.ACCURATE_API_HOST;
        const secret = process.env.ACCURATE_APP_SECRET;

        if (!token || !dbId || !host || !secret) {
            console.error("Accurate Config Error in getBranches");
            return [];
        }

        const url = new URL(`${host}/branch/list.do`);
        url.searchParams.append('fields', 'id,name');
        console.log("ACCURATE API URL:", url.toString());

        try {
            const timestamp = new Date().toISOString();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(timestamp);
            const signature = hmac.digest('base64');

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Session-ID': dbId,
                    'X-Api-Timestamp': timestamp,
                    'X-Api-Signature': signature
                },
            });

            if (!response.ok) {
                console.error("Accurate Branch Fetch Error:", await response.text());
                return [];
            }

            const data = await response.json();
            return (data.d || []).map((item: any) => ({
                id: item.id,
                name: item.name
            }));
        } catch (error) {
            console.error("getBranches Exception:", error);
            return [];
        }
    },

    async countUnpaidInvoicesByBranch(branchId: string): Promise<number> {
        const token = process.env.ACCURATE_API_TOKEN;
        const dbId = process.env.ACCURATE_DB_ID;
        const host = process.env.ACCURATE_API_HOST;
        const secret = process.env.ACCURATE_APP_SECRET;

        if (!token || !dbId || !host || !secret) return 0;

        const url = new URL(`${host}/sales-invoice/list.do`);
        url.searchParams.append('fields', 'id');
        url.searchParams.append('filter.primeOwing.op', 'GREATER_THAN');
        url.searchParams.append('filter.primeOwing.val', '0');
        url.searchParams.append('filter.branch.id.op', 'EQUAL');
        url.searchParams.append('filter.branch.id.val', branchId);
        url.searchParams.append('sp.page', '1');
        url.searchParams.append('sp.pageSize', '1');

        try {
            const timestamp = new Date().toISOString();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(timestamp);
            const signature = hmac.digest('base64');

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Session-ID': dbId,
                    'X-Api-Timestamp': timestamp,
                    'X-Api-Signature': signature
                },
            });

            if (!response.ok) return 0;

            const data = await response.json();
            return data.sp?.totalCount || 0;
        } catch (error) {
            console.error("countUnpaidInvoicesByBranch Exception:", error);
            return 0;
        }
    },

    async fetchCustomers(page: number = 1): Promise<{ customers: any[], totalCount: number }> {
        const token = process.env.ACCURATE_API_TOKEN;
        const dbId = process.env.ACCURATE_DB_ID;
        const host = process.env.ACCURATE_API_HOST;
        const secret = process.env.ACCURATE_APP_SECRET;

        if (!token || !dbId || !host || !secret) return { customers: [], totalCount: 0 };

        const url = new URL(`${host}/customer/list.do`);
        url.searchParams.append('fields', 'id,name,mobilePhone,phone,email'); // Added 'phone'
        url.searchParams.append('sp.page', page.toString());
        url.searchParams.append('sp.pageSize', '100');

        try {
            const timestamp = new Date().toISOString();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(timestamp);
            const signature = hmac.digest('base64');

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Session-ID': dbId,
                    'X-Api-Timestamp': timestamp,
                    'X-Api-Signature': signature
                },
            });

            if (!response.ok) return { customers: [], totalCount: 0 };

            const data = await response.json();
            return {
                customers: (data.d || []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    mobilePhone: item.mobilePhone,
                    phone: item.phone,
                    email: item.email
                })),
                totalCount: data.sp?.totalCount || 0
            };
        } catch (error) {
            console.error("fetchCustomers Exception:", error);
            return { customers: [], totalCount: 0 };
        }
    },

    async getCustomerDetail(customerId: string): Promise<{ id: string; name: string; mobilePhone: string | null; phone: string | null; email: string | null } | null> {
        const token = process.env.ACCURATE_API_TOKEN;
        const dbId = process.env.ACCURATE_DB_ID;
        const host = process.env.ACCURATE_API_HOST;
        const secret = process.env.ACCURATE_APP_SECRET;

        if (!token || !dbId || !host || !secret) return null;

        const url = new URL(`${host}/customer/detail.do`);
        url.searchParams.append('id', customerId);

        try {
            const timestamp = new Date().toISOString();
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(timestamp);
            const signature = hmac.digest('base64');

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Session-ID': dbId,
                    'X-Api-Timestamp': timestamp,
                    'X-Api-Signature': signature
                },
            });

            if (!response.ok) return null;

            const data = await response.json();
            if (!data.d) return null;

            return {
                id: data.d.id ? String(data.d.id) : customerId,
                name: data.d.name || '',
                mobilePhone: data.d.mobilePhone || null,
                phone: data.d.phone || null,
                email: data.d.email || null
            };
        } catch (error) {
            console.error("getCustomerDetail Exception:", error);
            return null;
        }
    }
};
