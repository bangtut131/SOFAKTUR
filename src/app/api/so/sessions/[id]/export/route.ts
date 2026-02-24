import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await prisma.soSession.findUnique({
            where: { id: id },
            include: {
                items: {
                    orderBy: { transDate: 'desc' }
                }
            }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const workbook = new ExcelJS.Workbook();

        // Split items: main vs excluded
        const mainItems = session.items.filter(item => item.existenceStatus !== 'Exclude');
        const excludedItems = session.items.filter(item => item.existenceStatus === 'Exclude');

        // ====== SHEET 1: Detail SO (non-excluded) ======
        const worksheet = workbook.addWorksheet('Detail SO');

        worksheet.columns = [
            { header: 'Status', key: 'status', width: 12 },
            { header: 'No Faktur', key: 'transNo', width: 20 },
            { header: 'Tanggal', key: 'transDate', width: 15 },
            { header: 'Customer', key: 'customerName', width: 35 },
            { header: 'Keterangan Barang', key: 'description', width: 40 },
            { header: 'Status Acc', key: 'statusName', width: 15 },
            { header: 'Approval Acc', key: 'approvalStatus', width: 15 },
            { header: 'Total Nilai', key: 'amount', width: 20 },
            { header: 'Sisa Tagihan', key: 'primeOwing', width: 20 },
            { header: 'Status Keberadaan', key: 'existenceStatus', width: 20 },
            { header: 'Keterangan Tambahan', key: 'remarks', width: 30 },
            { header: 'Waktu Scan', key: 'scannedAt', width: 20 },
        ];

        // Styling Header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F2937' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;

        // Populate Data (main items only)
        mainItems.forEach(item => {
            const row = worksheet.addRow({
                status: item.status === 'MATCHED' ? 'OK' : 'PENDING',
                transNo: item.transNo,
                transDate: item.transDate,
                customerName: item.customerName,
                description: item.description || '-',
                statusName: item.statusName || '-',
                approvalStatus: item.approvalStatus || '-',
                amount: item.amount,
                primeOwing: item.primeOwing,
                existenceStatus: item.existenceStatus || '-',
                remarks: item.remarks || '-',
                scannedAt: item.scannedAt ? new Date(item.scannedAt).toLocaleString('id-ID') : '-'
            });

            if (item.status === 'MATCHED') {
                row.getCell('status').font = { color: { argb: 'FF166534' }, bold: true };
            } else {
                row.getCell('status').font = { color: { argb: 'FFCA8A04' }, bold: true };
            }

            const extCell = row.getCell('existenceStatus');
            if (item.existenceStatus === 'Ada') {
                extCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBF7D0' } };
            } else if (item.existenceStatus === 'Hilang') {
                extCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
            } else if (item.existenceStatus === 'Dibawa Sales') {
                extCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
            }

            row.getCell('amount').numFmt = '#,##0';
            row.getCell('primeOwing').numFmt = '#,##0';
        });

        // Add borders
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // ====== SHEET 2: Excluded Invoices ======
        if (excludedItems.length > 0) {
            const exSheet = workbook.addWorksheet('Excluded Invoices');

            exSheet.columns = [
                { header: 'No', key: 'no', width: 6 },
                { header: 'No Faktur', key: 'transNo', width: 20 },
                { header: 'Tanggal', key: 'transDate', width: 15 },
                { header: 'Customer', key: 'customerName', width: 35 },
                { header: 'Keterangan', key: 'description', width: 40 },
                { header: 'Total Nilai', key: 'amount', width: 20 },
                { header: 'Sisa Tagihan', key: 'primeOwing', width: 20 },
                { header: 'Alasan Exclude', key: 'remarks', width: 30 },
            ];

            // Header styling (purple theme)
            const exHeaderRow = exSheet.getRow(1);
            exHeaderRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            exHeaderRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF7C3AED' } // Purple-600
            };
            exHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
            exHeaderRow.height = 30;

            // Data rows
            excludedItems.forEach((item, idx) => {
                const row = exSheet.addRow({
                    no: idx + 1,
                    transNo: item.transNo,
                    transDate: item.transDate,
                    customerName: item.customerName,
                    description: item.description || '-',
                    amount: item.amount,
                    primeOwing: item.primeOwing,
                    remarks: item.remarks || 'Excluded dari SO',
                });

                row.getCell('amount').numFmt = '#,##0';
                row.getCell('primeOwing').numFmt = '#,##0';
            });

            // Summary row
            const totalExAmount = excludedItems.reduce((sum, i) => sum + i.amount, 0);
            const totalExOwing = excludedItems.reduce((sum, i) => sum + i.primeOwing, 0);
            const summaryRow = exSheet.addRow({
                no: '',
                transNo: '',
                transDate: '',
                customerName: `TOTAL: ${excludedItems.length} faktur excluded`,
                description: '',
                amount: totalExAmount,
                primeOwing: totalExOwing,
                remarks: '',
            });
            summaryRow.font = { bold: true, size: 11 };
            summaryRow.getCell('amount').numFmt = '#,##0';
            summaryRow.getCell('primeOwing').numFmt = '#,##0';
            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3E8FF' } // Purple-50
            };

            // Borders
            exSheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();

        const safePeriodName = session.periodName.replace(/[^a-zA-Z0-9]/g, '_');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="SO_Detail_${safePeriodName}.xlsx"`
            }
        });

    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
    }
}

