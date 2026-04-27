// @ts-nocheck
import { useState, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
import { db } from '../../lib/db';

function generatePDFNilai(siswas: any[], mapels: any[], nilaiAll: any[], kelas: any, konfigurasi: any, gurus: any[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const tanggalCetak = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });

  const mapelHeaders = mapels.map(m => `<th style="text-align:center;min-width:60px;font-size:11px">${m.nama}</th>`).join('');

  const rows = siswas.map((s, idx) => {
    const cols = mapels.map(m => {
      const n = nilaiAll.find(x => x.siswa_id === s.id && x.mapel_id === m.id);
      const akhir = n ? (((n.nilai_asts || 0) + (n.nilai_asas || 0)) / 2).toFixed(1) : '-';
      const num = parseFloat(akhir);
      const color = isNaN(num) ? '#64748b' : num >= 75 ? '#16a34a' : num >= 60 ? '#d97706' : '#dc2626';
      return `<td style="text-align:center;font-weight:600;color:${color}">${akhir}</td>`;
    }).join('');
    return `<tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#fff'}">
      <td style="text-align:center">${idx + 1}</td>
      <td>${s.nama}</td>
      <td style="font-family:monospace;font-size:10px">${s.nisn}</td>
      ${cols}
    </tr>`;
  }).join('');

  // TTD wali kelas
  const waliKelas = gurus.find(g => g.kelas_wali_id === kelas?.id);
  const waliTtd = waliKelas?.ttd
    ? `<img src="${waliKelas.ttd}" style="height:60px;display:block;margin:0 auto"/>`
    : '<div style="height:60px"></div>';

  printWindow.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Rekap Nilai — ${kelas?.nama}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; font-size:12px; color:#1e293b; padding:20px; }
      td,th { padding:5px 8px; border-color:#cbd5e1; }
      @media print { body { padding:0; } }
    </style>
    </head><body>
    <!-- KOP SURAT -->
    <div style="text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:700;text-transform:uppercase">${konfigurasi.nama_sekolah}</div>
      <div style="font-size:12px">${konfigurasi.alamat_sekolah}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:14px;font-weight:700;text-decoration:underline">REKAP NILAI SISWA</div>
      <div style="font-size:11px;color:#475569">Kelas ${kelas?.nama} | Tahun Ajaran ${konfigurasi.tahun_ajaran} — Semester ${konfigurasi.semester}</div>
      <div style="font-size:11px;color:#475569">Dicetak: ${tanggalCetak}</div>
    </div>
    <table border="1" style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:24px">
      <thead style="background:#f1f5f9">
        <tr>
          <th style="text-align:center;width:30px">No</th>
          <th style="text-align:left">Nama Siswa</th>
          <th style="text-align:center">NISN</th>
          ${mapelHeaders}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:10px;color:#475569;margin-bottom:24px">
      Keterangan: Nilai = rata-rata (ASTS + ASAS) / 2 | 
      <span style="color:#16a34a">≥75 Tuntas</span> | 
      <span style="color:#d97706">60–74 Perlu Bimbingan</span> | 
      <span style="color:#dc2626">&lt;60 Belum Tuntas</span>
    </div>
    <table style="width:100%;text-align:center">
      <tr>
        <td style="width:33%">Mengetahui,<br>Kepala Sekolah<br><br>${
          konfigurasi.ttd_kepsek
            ? `<img src="${konfigurasi.ttd_kepsek}" style="height:60px"/>`
            : '<div style="height:60px"></div>'
        }<br><u>${konfigurasi.nama_kepsek}</u></td>
        <td style="width:33%">Wali Kelas<br><br>${waliTtd}<br><u>${waliKelas?.nama || '........................'}</u></td>
        <td style="width:33%"></td>
      </tr>
    </table>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>
  `);
  printWindow.document.close();
}

export default function RekapNilaiAdmin() {
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels]       = useState<any[]>([]);
  const [gurus, setGurus]         = useState<any[]>([]);
  const [siswas, setSiswas]       = useState<any[]>([]);
  const [nilaiAll, setNilaiAll]   = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState('');
  const [selectedKelas, setSelectedKelas] = useState<any>(null);
  const [konfigurasi, setKonfigurasi] = useState<any>({});
  const [loading, setLoading]     = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    db.getKelas().then(setKelasList);
    db.getMapel().then(setMapels);
    db.getGuru().then(setGurus);
    db.getKonfigurasi().then(setKonfigurasi);
  }, []);

  const loadNilai = async (kelasId: string) => {
    setLoading(true);
    setShowPreview(false);
    const kelas = kelasList.find(k => String(k.id) === kelasId);
    setSelectedKelas(kelas);
    const [sw, nl] = await Promise.all([
      db.getSiswa(Number(kelasId)),
      db.getNilaiByKelas(Number(kelasId)),
    ]);
    setSiswas(sw); setNilaiAll(nl);
    setLoading(false);
    setShowPreview(true);
  };

  const handleFilterKelas = (id: string) => {
    setFilterKelas(id);
    if (id) loadNilai(id);
    else { setSiswas([]); setNilaiAll([]); setShowPreview(false); }
  };

  const getNilaiSiswa = (siswaId: number, mapelId: number) =>
    nilaiAll.find(n => n.siswa_id === siswaId && n.mapel_id === mapelId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rekap Nilai</h1>
          <p className="text-slate-500 text-sm">Lihat dan download rekap nilai per kelas</p>
        </div>
        {showPreview && siswas.length > 0 && (
          <button onClick={() => generatePDFNilai(siswas, mapels, nilaiAll, selectedKelas, konfigurasi, gurus)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
            <Download size={16} /> Download PDF
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="block text-xs text-slate-500 mb-2">Pilih Kelas</label>
        <select value={filterKelas} onChange={e => handleFilterKelas(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">-- Pilih Kelas --</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      {loading && <div className="text-center py-10 text-slate-400">Memuat data...</div>}

      {/* Preview tabel nilai */}
      {showPreview && !loading && siswas.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Kelas {selectedKelas?.nama}</h3>
              <p className="text-xs text-slate-500">{siswas.length} siswa — {konfigurasi.tahun_ajaran} Semester {konfigurasi.semester}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Siswa</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">NISN</th>
                  {mapels.map(m => (
                    <th key={m.id} className="px-3 py-3 font-semibold text-slate-600 text-center whitespace-nowrap">{m.nama}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {siswas.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3 text-slate-400 text-sm">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.nama}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.nisn}</td>
                    {mapels.map(m => {
                      const n = getNilaiSiswa(s.id, m.id);
                      const akhir = n ? (((n.nilai_asts || 0) + (n.nilai_asas || 0)) / 2).toFixed(1) : '-';
                      const num = parseFloat(akhir);
                      const color = isNaN(num) ? 'text-slate-400' : num >= 75 ? 'text-emerald-600 font-bold' : num >= 60 ? 'text-amber-600 font-bold' : 'text-red-600 font-bold';
                      return <td key={m.id} className={`px-3 py-3 text-center ${color}`}>{akhir}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Keterangan warna */}
          <div className="flex gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> ≥75 Tuntas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> 60–74 Perlu Bimbingan</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> &lt;60 Belum Tuntas</span>
          </div>

          <div className="flex justify-end">
            <button onClick={() => generatePDFNilai(siswas, mapels, nilaiAll, selectedKelas, konfigurasi, gurus)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium">
              <Download size={16} /> Download PDF Rekap Nilai
            </button>
          </div>
        </div>
      )}

      {!filterKelas && !loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Pilih kelas untuk melihat rekap nilai.</div>
      )}
    </div>
  );
}
