import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

// Extend jsPDF if we still want to cast, but we will use the function directly
interface jsPDFCustom extends jsPDF {
    lastAutoTable: { finalY: number };
}

export const generatePDF = (session: any, items: any[]) => {
    const doc = new jsPDF() as unknown as jsPDFCustom;

    // Header
    doc.setFontSize(18);
    doc.text("Adjustment & Finalisasi Report", 14, 20);

    doc.setFontSize(11);
    doc.text(`Period: ${session.periodName}`, 14, 30);
    doc.text(`Status: ${session.status}`, 14, 36);
    doc.text(`Total Items: ${items.length}`, 14, 42);

    // Filter Stats
    const total = items.length;
    const verified = items.filter((i: any) => i.status === 'MATCHED').length;
    const unverified = items.length - verified;

    doc.setFontSize(10);
    doc.text(`Verified: ${verified} | Unverified: ${unverified}`, 14, 50);

    // Table Data preparation
    const tableColumn = [
        "No Faktur",
        "Tanggal",
        "Customer",
        "Nilai Faktur",
        "Sisa Tagihan",
        "Status Fisik",
        "Keterangan"
    ];

    const tableRows: any[] = [];

    items.forEach((item: any) => {
        const itemData = [
            item.transNo,
            item.transDate, // Assuming formatted date or string is passed
            item.customerName,
            new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.amount),
            new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.primeOwing),
            item.existenceStatus || '-',
            item.remarks || '-'
        ];
        tableRows.push(itemData);
    });

    const startY = 55;

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [31, 41, 55] }, // Dark Gray
        alternateRowStyles: { fillColor: [243, 244, 246] }, // Light Gray
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
        },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString('id-ID')}`, 14, finalY);

    // Save
    const safePeriodName = session.periodName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`SO_Report_${safePeriodName}.pdf`);
};
