import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// =================== BAFO PDF ===================

export interface SelisihRow {
    customerName: string;
    transNo: string;
    piutang: number;
    keterangan: string;
}

export interface BAFOSignatories {
    pemegangInvoice: { nama: string; tanggal: string };
    petugasOpname: { nama: string; tanggal: string };
    faSPV: { nama: string; tanggal: string };
    fam: { nama: string; tanggal: string };
}

export interface BAFOData {
    periodName: string;
    cutOffDate: string;
    docDate: string;
    sumAda: number; countAda: number;
    sumSales: number; countSales: number;
    sumHilang: number; countHilang: number;
    belumLunasRp: number; belumLunasLbr: number;
    selisihRp: number; selisihLbr: number;
    selisihRows: SelisihRow[];
    signatories: BAFOSignatories;
}

const idrFmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

export const generateBAFOPdf = (data: BAFOData) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    // --- Header: Company name + Title ---
    doc.setFillColor(26, 60, 109);
    doc.rect(10, y - 5, pageW - 20, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('GAMA AGRO SEJATI', 14, y + 3);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Chemicals, Fertilizers & Seeds', 14, y + 8);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BERITA ACARA FAKTUR OPNAME', pageW / 2, y + 5, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    y += 22;

    // Cut Off Date
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.text(`Cut Off Tgl : ${data.cutOffDate}`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // --- Summary Table ---
    const summaryBody: any[] = [
        ['Fisik Faktur Ada', idrFmt(data.sumAda), String(data.countAda)],
        ['Tukar Faktur', idrFmt(data.sumSales), String(data.countSales)],
    ];
    if (data.countHilang > 0) {
        summaryBody.push(['Faktur Hilang', idrFmt(data.sumHilang), String(data.countHilang)]);
    }
    const subtotalRp = data.sumAda + data.sumSales;
    const subtotalLbr = data.countAda + data.countSales;
    summaryBody.push(
        [{ content: '', styles: { fillColor: [240, 240, 240] } },
        { content: idrFmt(subtotalRp), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
        { content: String(subtotalLbr), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }],
        [{ content: 'Daftar Faktur Belum Lunas', styles: { fontStyle: 'bold' } },
        { content: idrFmt(data.belumLunasRp), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: String(data.belumLunasLbr), styles: { fontStyle: 'bold', halign: 'right' } }],
        ['Selisih', idrFmt(data.selisihRp), String(data.selisihLbr)],
    );

    autoTable(doc, {
        startY: y,
        head: [['', 'Jumlah (Rp)', 'Jumlah (Lembar)']],
        body: summaryBody,
        tableWidth: 130,
        columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 40, halign: 'right' }, 2: { cellWidth: 25, halign: 'right' } },
        headStyles: { fillColor: [229, 236, 244], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 2 },
        theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // --- Penjelasan Selisih ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Penjelasan Selisih :', 14, y);
    y += 4;

    const penjBody = data.selisihRows.length > 0
        ? data.selisihRows.map(r => [r.customerName, r.transNo, idrFmt(r.piutang), r.keterangan])
        : [['', '', '', '']];

    autoTable(doc, {
        startY: y,
        head: [['Nama Pelanggan', 'Nomor Invoice', 'Piutang', 'Keterangan']],
        body: penjBody,
        tableWidth: pageW - 28,
        columnStyles: { 2: { halign: 'right' } },
        headStyles: { fillColor: [229, 236, 244], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 2 },
        theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // --- Doc Date ---
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.text(data.docDate, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    // --- Signature Table ---
    const sig = data.signatories;
    const sigCols = ['Pemegang Invoice', 'Petugas Opname', 'FA SPV', 'FAM'];
    const colW = (pageW - 28) / 4;

    autoTable(doc, {
        startY: y,
        head: [sigCols],
        body: [
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            [
                `Nama: ${sig.pemegangInvoice.nama}`,
                `Nama: ${sig.petugasOpname.nama}`,
                `Nama: ${sig.faSPV.nama}`,
                `Nama: ${sig.fam.nama}`
            ],
            [
                `Tanggal: ${sig.pemegangInvoice.tanggal}`,
                `Tanggal: ${sig.petugasOpname.tanggal}`,
                `Tanggal: ${sig.faSPV.tanggal}`,
                `Tanggal: ${sig.fam.tanggal}`
            ],
        ],
        tableWidth: pageW - 28,
        columnStyles: { 0: { cellWidth: colW }, 1: { cellWidth: colW }, 2: { cellWidth: colW }, 3: { cellWidth: colW } },
        headStyles: { fillColor: [229, 236, 244], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 2, minCellHeight: 12 },
        theme: 'grid',
    });

    const safeName = data.periodName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`BAFO_${safeName}.pdf`);
};
