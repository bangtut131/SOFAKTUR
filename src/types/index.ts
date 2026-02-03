
export interface Invoice {
    id: string; // Accurate ID
    transDate: string;
    transNo: string;
    customerName: string;
    amount: number;         // totalAmount (Nilai Faktur)
    outstanding: number;    // field 'outstanding' check user requirement (Original Outstanding?)
    primeOwing: number;     // field 'primeOwing' (Sisa Tagihan)
    status: 'UNVERIFIED' | 'MATCHED' | 'MISSING_DOC' | 'EXTRA_DOC';
    scannedAt?: string;
    dueDate?: string;
    description?: string;
    statusName?: string;
    approvalStatus?: string;
}

export interface WeeklySummary {
    weekId: string;
    startDate: string;
    endDate: string;
    totalInvoices: number;
    matchedCount: number;
    missingCount: number;
    extraCount: number;
}
