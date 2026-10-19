const PptxGenJS = require('pptxgenjs');

let pres = new PptxGenJS();
pres.layout = 'LAYOUT_16x9';

// Slide 1: Title
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

// Slide 2: Latar Belakang & Masalah
let slide2 = pres.addSlide();
slide2.addText('Latar Belakang & Permasalahan', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide2.addText(
    [
        { text: 'Mengapa Sistem Ini Dibutuhkan?', options: { bold: true, fontSize: 24, breakLine: true } },
        { text: '• Penagihan Manual: Tim AR (Accounts Receivable) harus memeriksa dan menagih piutang satu per satu, yang memakan waktu.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Tagihan Terlewat: Sering terjadi keterlambatan bayar karena tidak ada pengingat otomatis (reminder) ke pelanggan menjelang jatuh tempo.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Verifikasi Faktur Rumit: Tanpa sistem scanner dan pencarian cepat, pelacakan faktur penjualan menjadi lambat.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Cash Flow Terhambat: Piutang yang tidak tertagih tepat waktu berdampak langsung terhadap arus kas perusahaan.', options: { fontSize: 20, bullet: true, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// Slide 3: Tujuan & Manfaat (Value Proposition)
let slide3 = pres.addSlide();
slide3.addText('Tujuan & Manfaat Aplikasi', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});
slide3.addText(
    [
        { text: 'Manfaat Utama bagi Perusahaan:', options: { bold: true, fontSize: 24, breakLine: true } },
        { text: '• Efisiensi Penagihan (Auto Tagih): Sistem otomatis mengirimkan pesan tagihan ke WhatsApp pelanggan untuk piutang yang belum lunas.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Optimalisasi Arus Kas: Disiplin penagihan yang lebih baik mempercepat pelunasan dan menjaga stabilitas cash flow.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Pencarian Faktur Cepat: Dukungan fitur Scanner Interface memudahkan user melacak data faktur & SO dalam hitungan detik.', options: { fontSize: 20, bullet: true, breakLine: true } },
        { text: '• Pantauan Data Terpadu: Dasbor real-time untuk memonitor total piutang, status pengiriman WA, dan faktur yang beredar.', options: { fontSize: 20, bullet: true, breakLine: true } }
    ],
    { x: 0.5, y: 1.8, w: '90%', h: 3.5, color: '333333' }
);

// Slide 4: Fitur Utama Aplikasi
let slide4 = pres.addSlide();
slide4.addText('Fitur Utama', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});

slide4.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.6, w: 4.2, h: 1.5, fill: '4472c4', line: '2f5597' });
slide4.addText('Manajemen Faktur & SO\nModul lengkap untuk merekam, melacak, & memproses data Sales Order serta Faktur Penjualan.', {
    x: 0.5, y: 1.6, w: 4.2, h: 1.5, color: 'ffffff', fontSize: 16, align: 'center', valign: 'middle'
});

slide4.addShape(pres.ShapeType.rect, { x: 5.3, y: 1.6, w: 4.2, h: 1.5, fill: '4472c4', line: '2f5597' });
slide4.addText('Interface Scanner\nInput & validasi faktur instan menggunakan alat scan untuk mempercepat kinerja di lapangan/gudang.', {
    x: 5.3, y: 1.6, w: 4.2, h: 1.5, color: 'ffffff', fontSize: 16, align: 'center', valign: 'middle'
});

slide4.addShape(pres.ShapeType.rect, { x: 0.5, y: 3.5, w: 4.2, h: 1.5, fill: '4472c4', line: '2f5597' });
slide4.addText('Modul Piutang (AR)\nDashboard rincian pelanggan yang masih memiliki tunggakan, dilengkapi status mutasi/pembayaran.', {
    x: 0.5, y: 3.5, w: 4.2, h: 1.5, color: 'ffffff', fontSize: 16, align: 'center', valign: 'middle'
});

slide4.addShape(pres.ShapeType.rect, { x: 5.3, y: 3.5, w: 4.2, h: 1.5, fill: 'd9534f', line: 'c9302c' });
slide4.addText('Auto Tagih (WhatsApp Broadcast)\nBot mengirimkan notifikasi tagihan otomatis menuju device WA pelanggan berdasarkan jadwal.', {
    x: 5.3, y: 3.5, w: 4.2, h: 1.5, color: 'ffffff', fontSize: 16, align: 'center', valign: 'middle', bold: true
});

// Slide 5: Alur Kerja (Workflow)
let slide5 = pres.addSlide();
slide5.addText('Alur Kerja Sistem (Workflow)', {
    x: 0.5, y: 0.5, w: '90%', h: 1,
    fontSize: 32, color: '203864', bold: true, border: [0, 0, {pt: 2, color: '203864'}, 0]
});

slide5.addText('1. Faktur Dibuat\n& Discan', { x: 0.5, y: 2.2, w: 2, h: 1.2, fill: '548235', color:'ffffff', fontSize: 16, align: 'center', bold: true });
slide5.addText('2. Data Masuk ke\nModul Piutang', { x: 3.2, y: 2.2, w: 2, h: 1.2, fill: 'ed7d31', color:'ffffff', fontSize: 16, align: 'center', bold: true });
slide5.addText('3. Deteksi Auto\nJatuh Tempo', { x: 5.9, y: 2.2, w: 2, h: 1.2, fill: 'c00000', color:'ffffff', fontSize: 16, align: 'center', bold: true });
slide5.addText('4. Broadcast WA\nAuto Tagih', { x: 8.6, y: 2.2, w: 1.5, h: 1.2, fill: '203864', color:'ffffff', fontSize: 16, align: 'center', bold: true });

slide5.addShape(pres.ShapeType.rightArrow, { x: 2.6, y: 2.6, w: 0.5, h: 0.4, fill: 'd9d9d9' });
slide5.addShape(pres.ShapeType.rightArrow, { x: 5.3, y: 2.6, w: 0.5, h: 0.4, fill: 'd9d9d9' });
slide5.addShape(pres.ShapeType.rightArrow, { x: 8.0, y: 2.6, w: 0.5, h: 0.4, fill: 'd9d9d9' });

slide5.addText('User scan / proses faktur penjualan baru secara sistem.', { x: 0.5, y: 3.8, w: 2, h: 1, fontSize: 12, align: 'center' });
slide5.addText('Sistem merekam nilai hutang pelanggan & menetapkan tanggal batas akhir bayar.', { x: 3.2, y: 3.8, w: 2, h: 1, fontSize: 12, align: 'center' });
slide5.addText('Cronjob mengecek api jadwal harian mana faktur yang akan jatuh tempo.', { x: 5.9, y: 3.8, w: 2, h: 1, fontSize: 12, align: 'center' });
slide5.addText('Integrasi WA Gateway mengirim format tagihan langsung.', { x: 8.4, y: 3.8, w: 1.9, h: 1, fontSize: 12, align: 'center' });

// Slide 6: Penutup
let slide6 = pres.addSlide();
slide6.background = { color: '203864' };
slide6.addText('Terima Kasih', {
    x: 1, y: 2.0, w: '80%', h: 1.5,
    fontSize: 48, color: 'ffffff', bold: true, align: 'center'
});
slide6.addText('Digitalisasi Penagihan untuk Arus Kas yang Lebih Baik.', {
    x: 1, y: 3.5, w: '80%', h: 1,
    fontSize: 22, color: 'd9e2f3', align: 'center'
});

const fileName = 'Presentasi_SO_Faktur_Auto_Tagih.pptx';
pres.writeFile({ fileName: fileName }).then(() => {
    console.log(`Presentation created successfully: ${fileName}`);
}).catch(err => {
    console.error(`Error:`, err);
});
