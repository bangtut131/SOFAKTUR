import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await prisma.soSession.findUnique({
            where: { id: params.id },
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
        const worksheet = workbook.addWorksheet('Detail SO');

        // Define Columns
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
            fgColor: { argb: 'FF1F2937' } // Gray-800 like
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;

        // Populate Data
        session.items.forEach(item => {
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

            // Conditional Styling per Row
            // Status Check (Green for OK)
            if (item.status === 'MATCHED') {
                row.getCell('status').font = { color: { argb: 'FF166534' }, bold: true }; // Green-700
            } else {
                row.getCell('status').font = { color: { argb: 'FFCA8A04' }, bold: true }; // Yellow-600
            }

            // Existence Status Styling
            const extCell = row.getCell('existenceStatus');
            if (item.existenceStatus === 'Ada') {
                extCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBF7D0' } }; // Green-200
            } else if (item.existenceStatus === 'Hilang') {
                extCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }; // Red-200
            } else if (item.existenceStatus === 'Dibawa Sales') {
                extCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }; // Amber-200
            }

            // Format Numbers
            row.getCell('amount').numFmt = '#,##0';
            row.getCell('primeOwing').numFmt = '#,##0';
        });

        // Add Borders to all cells
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        // Clean period name for filename
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
