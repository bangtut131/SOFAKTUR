import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

interface SelisihRow {
    customerName: string;
    transNo: string;
    piutang: number;
    keterangan: string;
}

interface Signatories {
    pemegangInvoice: { nama: string; tanggal: string };
    petugasOpname: { nama: string; tanggal: string };
    faSPV: { nama: string; tanggal: string };
    fam: { nama: string; tanggal: string };
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await req.json();
        const {
            cutOffDate = '',
            docDate = '',
            selisihRows = [] as SelisihRow[],
            signatories = {} as Signatories,
        } = body;

        const session = await prisma.soSession.findUnique({
            where: { id },
            include: { items: { orderBy: { customerName: 'asc' } } }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // --- Compute summary stats ---
        const nonExcluded = session.items.filter(i => i.existenceStatus !== 'Exclude');
        const adaItems = nonExcluded.filter(i => i.existenceStatus === 'Ada');
        const salesItems = nonExcluded.filter(i => i.existenceStatus === 'Dibawa Sales');
        const hilangItems = nonExcluded.filter(i => i.existenceStatus === 'Hilang');

        const sumAda = adaItems.reduce((s, i) => s + i.primeOwing, 0);
        const sumSales = salesItems.reduce((s, i) => s + i.primeOwing, 0);
        const sumHilang = hilangItems.reduce((s, i) => s + i.primeOwing, 0);
        const subtotalRp = sumAda + sumSales;
        const subtotalLbr = adaItems.length + salesItems.length;

        const belumLunasRp = nonExcluded.reduce((s, i) => s + i.primeOwing, 0);
        const belumLunasLbr = nonExcluded.length;

        const selisihRp = belumLunasRp - subtotalRp;
        const selisihLbr = belumLunasLbr - subtotalLbr;

        // --- Build Workbook ---
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('BAFO');

        // Helper: set border on range
        const applyBorder = (
            startRow: number, endRow: number,
            startCol: number, endCol: number,
            style: ExcelJS.BorderStyle = 'thin'
        ) => {
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const cell = ws.getCell(r, c);
                    cell.border = {
                        top: { style },
                        left: { style },
                        bottom: { style },
                        right: { style }
                    };
                }
            }
        };

        // Set column widths (A–H)
        ws.getColumn(1).width = 30; // A – Label / Nama Pelanggan
        ws.getColumn(2).width = 22; // B – Jumlah Rp / Nomor Invoice
        ws.getColumn(3).width = 18; // C – Jumlah Lembar / Piutang
        ws.getColumn(4).width = 22; // D – Keterangan
        ws.getColumn(5).width = 18; // E – (empty)
        ws.getColumn(6).width = 18; // F – Tanda tangan col 3
        ws.getColumn(7).width = 18; // G – Tanda tangan col 4

        // --- LOGO (row 1-3, col A) ---
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
            const logoId = workbook.addImage({
                filename: logoPath,
                extension: 'png'
            });
            ws.addImage(logoId, {
                tl: { col: 0, row: 0 } as any,
                br: { col: 1, row: 3 } as any,
            } as any);
        }

        // --- TITLE (row 1-3, col B-G) ---
        ws.mergeCells('B1:G3');
        const titleCell = ws.getCell('B1');
        titleCell.value = 'BERITA ACARA FAKTUR OPNAME';
        titleCell.font = { bold: true, size: 18, color: { argb: 'FF1a3c6d' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Border around logo+title header
        applyBorder(1, 3, 1, 1);
        applyBorder(1, 3, 2, 7);

        // Row 4: spacer
        ws.getRow(4).height = 8;

        // --- Cut Off Tgl (row 5) ---
        ws.mergeCells('A5:G5');
        ws.getCell('A5').value = `Cut Off Tgl : ${cutOffDate}`;
        ws.getCell('A5').font = { bold: false, size: 11, color: { argb: 'FF2563EB' } };
        ws.getRow(5).height = 18;

        // Row 6: spacer
        ws.getRow(6).height = 6;

        // --- Summary Table Header (row 7) ---
        ws.getRow(7).height = 20;
        // Labels
        ws.getCell('B7').value = 'Jumlah (Rp)';
        ws.getCell('C7').value = 'Jumlah (Lembar)';
        ['B7', 'C7'].forEach(addr => {
            const c = ws.getCell(addr);
            c.font = { bold: true, size: 11 };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5ECF4' } };
        });
        applyBorder(7, 7, 2, 3);

        // Helper format currency
        const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));

        // --- Summary Rows ---
        const addSummaryRow = (
            rowNum: number,
            label: string,
            rp: number | string,
            lbr: number | string,
            bold = false,
            rpColor?: string
        ) => {
            ws.getRow(rowNum).height = 18;
            ws.getCell(rowNum, 1).value = label;
            ws.getCell(rowNum, 1).font = { bold, size: 11 };

            const rpVal = typeof rp === 'number' ? rp : rp;
            const lbrVal = typeof lbr === 'number' ? lbr : lbr;

            ws.getCell(rowNum, 2).value = typeof rp === 'number' ? rp : '';
            ws.getCell(rowNum, 2).numFmt = '#,##0';
            ws.getCell(rowNum, 2).font = { bold, size: 11, color: { argb: rpColor || 'FF1a3c6d' } };
            ws.getCell(rowNum, 2).alignment = { horizontal: 'right' };

            ws.getCell(rowNum, 3).value = typeof lbr === 'number' ? lbr : '';
            ws.getCell(rowNum, 3).numFmt = '#,##0';
            ws.getCell(rowNum, 3).font = { bold, size: 11, color: { argb: rpColor || 'FF1a3c6d' } };
            ws.getCell(rowNum, 3).alignment = { horizontal: 'right' };
        };

        // Row 8: Fisik Faktur Ada
        addSummaryRow(8, 'Fisik Faktur Ada', sumAda, adaItems.length);
        // Row 9: Tukar Faktur
        addSummaryRow(9, 'Tukar Faktur', sumSales, salesItems.length);
        // Row 10: Faktur Hilang (if any)
        let nextRow = 10;
        if (hilangItems.length > 0) {
            addSummaryRow(10, 'Faktur Hilang', sumHilang, hilangItems.length, false, 'FFDC2626');
            nextRow = 11;
        }

        // Subtotal row
        addSummaryRow(nextRow, '', subtotalRp, subtotalLbr, true);
        ws.getRow(nextRow).getCell(2).border = { top: { style: 'thin' } };
        ws.getRow(nextRow).getCell(3).border = { top: { style: 'thin' } };
        nextRow++;

        // Daftar Faktur Belum Lunas
        addSummaryRow(nextRow, 'Daftar Faktur Belum Lunas', belumLunasRp, belumLunasLbr, true);
        nextRow++;

        // Selisih
        addSummaryRow(nextRow, 'Selisih', selisihRp, selisihLbr, false, selisihRp !== 0 ? 'FFDC2626' : 'FF16A34A');
        nextRow++;

        // Row spacer
        nextRow++;

        // --- Penjelasan Selisih ---
        ws.getRow(nextRow).height = 18;
        ws.getCell(nextRow, 1).value = 'Penjelasan Selisih :';
        ws.getCell(nextRow, 1).font = { bold: true, size: 11 };
        nextRow++;

        // Penjelasan header
        const penjHdrRow = nextRow;
        ws.getRow(penjHdrRow).height = 18;
        ['Nama Pelanggan', 'Nomor Invoice', 'Piutang', 'Keterangan'].forEach((h, i) => {
            const cell = ws.getCell(penjHdrRow, i + 1);
            cell.value = h;
            cell.font = { bold: true, size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5ECF4' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        nextRow++;

        // Penjelasan data rows
        const penjelasanRows: SelisihRow[] = selisihRows.length > 0 ? selisihRows : [
            { customerName: '', transNo: '', piutang: 0, keterangan: '' }
        ];

        penjelasanRows.forEach(row => {
            ws.getRow(nextRow).height = 16;
            ws.getCell(nextRow, 1).value = row.customerName;
            ws.getCell(nextRow, 2).value = row.transNo;
            ws.getCell(nextRow, 3).value = row.piutang;
            ws.getCell(nextRow, 3).numFmt = '#,##0';
            ws.getCell(nextRow, 4).value = row.keterangan;
            for (let c = 1; c <= 4; c++) {
                ws.getCell(nextRow, c).font = { size: 10 };
                ws.getCell(nextRow, c).border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            }
            nextRow++;
        });

        // Spacer
        nextRow++;

        // --- Doc Date ---
        ws.getRow(nextRow).height = 18;
        ws.mergeCells(nextRow, 1, nextRow, 7);
        ws.getCell(nextRow, 1).value = docDate;
        ws.getCell(nextRow, 1).font = { bold: false, size: 11, color: { argb: 'FF2563EB' } };
        nextRow += 2;

        // --- Signature Header ---
        ws.getRow(nextRow).height = 20;
        const sigHeaders = ['Pemegang Invoice', 'Petugas Opname', 'FA SPV', 'FAM'];
        // Col mapping: 1, 2, 4, 6 (merge 4-5, 6-7) — simpler: use 4 cols of equal width
        const sigCols = [1, 2, 4, 6];
        sigHeaders.forEach((h, i) => {
            const col = sigCols[i];
            ws.mergeCells(nextRow, col, nextRow, col + 1);
            const cell = ws.getCell(nextRow, col);
            cell.value = h;
            cell.font = { bold: true, size: 10 };
            cell.alignment = { horizontal: 'center' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5ECF4' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        nextRow++;

        // Sub-header FA SPV / FAM — actually it's fine as is in merged cells above
        // Blank sign area (3 rows)
        for (let r = 0; r < 3; r++) {
            ws.getRow(nextRow).height = 20;
            sigCols.forEach(col => {
                ws.mergeCells(nextRow, col, nextRow, col + 1);
                ws.getCell(nextRow, col).border = {
                    left: { style: 'thin' }, right: { style: 'thin' },
                    ...(r === 2 ? { bottom: { style: 'thin' } } : {})
                };
            });
            nextRow++;
        }

        // Nama & Tanggal rows
        const sig = signatories as Signatories;
        const sigData = [
            { nama: sig?.pemegangInvoice?.nama || '', tanggal: sig?.pemegangInvoice?.tanggal || '' },
            { nama: sig?.petugasOpname?.nama || '', tanggal: sig?.petugasOpname?.tanggal || '' },
            { nama: sig?.faSPV?.nama || '', tanggal: sig?.faSPV?.tanggal || '' },
            { nama: sig?.fam?.nama || '', tanggal: sig?.fam?.tanggal || '' },
        ];

        ['Nama:', 'Tanggal:'].forEach((label) => {
            ws.getRow(nextRow).height = 16;
            sigCols.forEach((col, i) => {
                ws.mergeCells(nextRow, col, nextRow, col + 1);
                const cell = ws.getCell(nextRow, col);
                const val = label === 'Nama:' ? sigData[i].nama : sigData[i].tanggal;
                cell.value = `${label} ${val}`;
                cell.font = { bold: true, size: 10 };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
            nextRow++;
        });

        // --- Output ---
        const buffer = await workbook.xlsx.writeBuffer();
        const safeName = session.periodName.replace(/[^a-zA-Z0-9]/g, '_');

        return new NextResponse(buffer as ArrayBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="BAFO_${safeName}.xlsx"`
            }
        });

    } catch (err: any) {
        console.error("BAFO Export Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
