const PptxGenJS = require('pptxgenjs');

let pres = new PptxGenJS();
pres.layout = 'LAYOUT_16x9';

// ======================= Slide 1: Title
let slide1 = pres.addSlide();
slide1.background = { color: '203864' }; // Dark blue
slide1.addText('Sistem SO Faktur Jual\n& Auto Tagih', {
    x: 1, y: 2, w: '80%', h: 1.5,
    fontSize: 48, color: 'ffffff', bold: true, align: 'center'
});
slide1.addText('Solusi Otomatisasi Penjualan dan Penagihan Piutang Terintegrasi via WhatsApp', {
    x: 1, y: 3.8, w: '80%', h: 1,
    fontSize: 20, color: 'd9e2f3', align: 'center'
});

// ======================= Slide 2: Latar Belakang Industri
let slide2 = pres.addSlide();
slide2.addText('1. Latar Belakang', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide2.addText(
    [
        { text: 'Pentingnya Perputaran Arus Kas (Cash Flow)', options: { bold: true, fontSize: 24, breakLine: true } },
        { text: '• Dalam bisnis distribusi dan trading, perputaran uang yang cepat sangat penting bagi keberlangsungan operasional.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Semakin lama piutang tertahan, semakin sulit perusahaan menjalankan ekspansi atau pemenuhan arus stok barang.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Menjaga kedisiplinan pembayaran dari pelanggan (customer) merupakan kunci stabilitas keuangan perusahaan.', options: { fontSize: 20, bullet: true, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 3: Permasalahan (Pain Points)
let slide3 = pres.addSlide();
slide3.addText('2. Permasalahan Saat Ini (Pain Points)', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide3.addText(
    [
        { text: 'Hambatan dalam Proses Manual:', options: { bold: true, fontSize: 24, breakLine: true } },
        { text: '• Penagihan Manual: Tim AR memakan waktu sangat lama untuk memilah piutang mana yang harus ditagih hari ini.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Keterlambatan Pembayaran: Karena tidak ada sistem notifikasi otomatis menjelang dan saat hari jatuh tempo.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Pencarian Faktur Kuno: Validasi resi/faktur fisik di gudang bisa memakan waktu berjam-jam.', options: { fontSize: 20, bullet: true, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 4: Solusi Aplikasi
let slide4 = pres.addSlide();
slide4.addText('3. Solusi Aplikasi', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide4.addText(
    [
        { text: 'SO Faktur & Auto Tagih Hadir Sebagai Jembatan:', options: { bold: true, fontSize: 24, breakLine: true } },
        { text: '• Merombak proses pengelolaan faktur menjadi digital 100%.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Memanfaatkan kekuatan WhatsApp (API) sebagai media interaksi bot karena tingkat \'open rate/dibaca\' yang tinggi dari pelanggan.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Menggabungkan modul pesanan (Sales Order), gudang (Scanner), dan finansial (Piutang) ke dalam satu platform web.', options: { fontSize: 20, bullet: true, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 5: Tujuan & Manfaat Utama
let slide5 = pres.addSlide();
slide5.addText('4. Tujuan & Manfaat Utama', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide5.addText(
    [
        { text: 'Keuntungan Langsung yang Dirasakan:', options: { bold: true, fontSize: 24, breakLine: true } },
        { text: '• Efisiensi SDM: Staf finance /AR dapat fokus pada analisis pembayaran ketimbang menelpon pelanggan.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Real-Time Monitoring: Manajemen (BOS) dapat melihat pergerakan angka piutang tertunggak secara live.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Profesionalitas di Mata Klien: Tagihan yang rapi & otomatis menambah kepercayaan serta citra disiplin perusahaan.', options: { fontSize: 20, bullet: true, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 6: Fitur Utama (Overview)
let slide6 = pres.addSlide();
slide6.addText('5. Empat Pilar Fitur Utama', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide6.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.0, w: 2.1, h: 2, fill: '4472c4', line: '2f5597' });
slide6.addText('SO & Faktur\nJual', { x: 0.5, y: 2.0, w: 2.1, h: 2, color: 'ffffff', fontSize: 18, align: 'center', bold: true, valign: 'middle' });

slide6.addShape(pres.ShapeType.rect, { x: 2.9, y: 2.0, w: 2.1, h: 2, fill: '548235', line: '385723' });
slide6.addText('Scanner\nInterface', { x: 2.9, y: 2.0, w: 2.1, h: 2, color: 'ffffff', fontSize: 18, align: 'center', bold: true, valign: 'middle' });

slide6.addShape(pres.ShapeType.rect, { x: 5.3, y: 2.0, w: 2.1, h: 2, fill: 'ed7d31', line: 'c65911' });
slide6.addText('Modul\nPiutang (AR)', { x: 5.3, y: 2.0, w: 2.1, h: 2, color: 'ffffff', fontSize: 18, align: 'center', bold: true, valign: 'middle' });

slide6.addShape(pres.ShapeType.rect, { x: 7.7, y: 2.0, w: 2.1, h: 2, fill: 'd9534f', line: 'c9302c' });
slide6.addText('Auto\nTagih WA', { x: 7.7, y: 2.0, w: 2.1, h: 2, color: 'ffffff', fontSize: 18, align: 'center', bold: true, valign: 'middle' });


// ======================= Slide 7: Detail Fitur - SO Faktur
let slide7 = pres.addSlide();
slide7.addText('Fitur 1: Sales Order & Faktur Jual', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide7.addText(
    [
        { text: '• Pencatatan Tersentralisasi', options: { bold: true, fontSize: 22, breakLine: true } },
        { text: '  Semua pembuatan SO (Sales Order) akan dikonversi menjadi Faktur Pengiriman yang dapat dilacak statusnya.', options: { fontSize: 18, breakLine: true } },
        { text: '• Kalkulasi Pajak & Diskon', options: { bold: true, fontSize: 22, breakLine: true } },
        { text: '  Mencegah salah perhitungan harga akhir, mempermudah pembuatan dokumen tagihan legal.', options: { fontSize: 18, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 8: Detail Fitur - Scanner
let slide8 = pres.addSlide();
slide8.addText('Fitur 2: Scanner Interface', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide8.addText(
    [
        { text: '• Validasi Gudang Super Cepat', options: { bold: true, fontSize: 22, breakLine: true } },
        { text: '  Staff gudang tidak perlu mengetik panjang-panjang, cukup di-scan menggunakan perangkat QR/Barcode.', options: { fontSize: 18, breakLine: true } },
        { text: '• Menurunkan Human Error', options: { bold: true, fontSize: 22, breakLine: true } },
        { text: '  Risiko mengirim barang yang salah, atau faktur ganda bisa diminimalisir.', options: { fontSize: 18, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 9: Detail Fitur - Modul Piutang
let slide9 = pres.addSlide();
slide9.addText('Fitur 3: Manajemen Piutang (Accounts Receivable)', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide9.addText(
    [
        { text: '• Dashboard Aging Piutang', options: { bold: true, fontSize: 22, breakLine: true } },
        { text: '  Sistem mengkategorikan tagihan belum lunas berdasar usia/umur piutang (contoh: 15 Hari, 30 Hari, 60 Hari).', options: { fontSize: 18, breakLine: true } },
        { text: '• Integrasi Mutasi Rekening (Opsional/Sistem Internal)', options: { bold: true, fontSize: 22, breakLine: true } },
        { text: '  Kemudahan dalam rekonsiliasi data dan pencatatan uang masuk/DP secara otomatis.', options: { fontSize: 18, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 10: Detail Fitur - Auto Tagih
let slide10 = pres.addSlide();
slide10.addText('Fitur 4: WhatsApp Broadcast / Auto Tagih', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide10.addText(
    [
        { text: 'Ini adalah INTINTI INOVASI dari aplikasi:', options: { bold: true, fontSize: 22, breakLine: true, color: 'c00000' } },
        { text: '• Penjadwalan Otomatis (Cron Job)', options: { bold: true, fontSize: 20, breakLine: true } },
        { text: '  Tanpa disuruh karyawan, aplikasi otomatis mendeteksi faktur yang H-3, Hari-H, atau H+ jatuh tempo.', options: { fontSize: 18, breakLine: true } },
        { text: '• Pesan Dinamis & Sopan', options: { bold: true, fontSize: 20, breakLine: true } },
        { text: '  Template pesan menarik menyertakan Nama Usaha Pelanggan, Nomor Faktur, Total Tagihan yang dirancang anti-diblokir (spintax).', options: { fontSize: 18, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// ======================= Slide 11: Workflow / Alur Kerja
let slide11 = pres.addSlide();
slide11.addText('Alur Integrasi (Workflow)', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});

slide11.addShape(pres.ShapeType.rect, { x: 0.6, y: 2.0, w: 1.5, h: 1.5, fill: 'bfbfbf' });
slide11.addText('Faktur', { x: 0.6, y: 2.0, w: 1.5, h: 1.5, align: 'center', valign: 'middle', bold: true });

slide11.addShape(pres.ShapeType.rightArrow, { x: 2.2, y: 2.5, w: 0.7, h: 0.3, fill: '44546a' });

slide11.addShape(pres.ShapeType.rect, { x: 3.0, y: 2.0, w: 1.5, h: 1.5, fill: 'bfbfbf' });
slide11.addText('Piutang\nMuncul', { x: 3.0, y: 2.0, w: 1.5, h: 1.5, align: 'center', valign: 'middle', bold: true });

slide11.addShape(pres.ShapeType.rightArrow, { x: 4.6, y: 2.5, w: 0.7, h: 0.3, fill: '44546a' });

slide11.addShape(pres.ShapeType.rect, { x: 5.4, y: 2.0, w: 1.5, h: 1.5, fill: 'ffc000' });
slide11.addText('JatuhTempo\nSistem', { x: 5.4, y: 2.0, w: 1.5, h: 1.5, align: 'center', valign: 'middle', bold: true });

slide11.addShape(pres.ShapeType.rightArrow, { x: 7.0, y: 2.5, w: 0.7, h: 0.3, fill: '44546a' });

slide11.addShape(pres.ShapeType.rect, { x: 7.8, y: 2.0, w: 1.5, h: 1.5, fill: '00b050', color: 'ffffff' });
slide11.addText('Tagihan WA\nTerkirim', { x: 7.8, y: 2.0, w: 1.5, h: 1.5, align: 'center', valign: 'middle', bold: true, color: 'ffffff' });

slide11.addText(
    'Alur ini berjalan terpusat sehingga pelanggan langsung merespons karena tagihan menyajikan detail yang valid masuk di gawai pribadi mereka.',
    { x: 0.5, y: 4.0, w: '90%', h: 1, fontSize: 18, color: '333333', align: 'center', italic: true }
);

// ======================= Slide 12: Kesimpulan & Harapan
let slide12 = pres.addSlide();
slide12.background = { color: '203864' };
slide12.addText('Terima Kasih', {
    x: 1, y: 1.8, w: '80%', h: 1.5,
    fontSize: 54, color: 'ffffff', bold: true, align: 'center'
});
slide12.addText('Saatnya Mengendalikan Piutang, Mendorong Kesehatan Finansial.', {
    x: 1, y: 3.2, w: '80%', h: 1,
    fontSize: 22, color: 'd9e2f3', align: 'center', italic: true
});
slide12.addText('— Aplikasi SO Faktur Jual & Auto Tagih —', {
    x: 1, y: 4.0, w: '80%', h: 1,
    fontSize: 18, color: 'ffffff', align: 'center'
});

const fileName = 'Presentasi_SO_Faktur_Auto_Tagih_Lengkap.pptx';
pres.writeFile({ fileName: fileName }).then(() => {
    console.log(`Presentation created successfully: ${fileName}`);
}).catch(err => {
    console.error(`Error:`, err);
});
