// @ts-nocheck
import { useState, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
import { db } from '../../lib/db';

function generatePDFJurnal(rekapData: any[], konfigurasi: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const tanggalCetak = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });

  const body = rekapData.map(r => {
    const rows = r.jurnals.map((j: any, idx: number) => {
      const jadwal = r.jadwals.find((jd: any) => jd.id === j.jadwal_id);
      const mapelNama  = r.mapels.find((m: any) => m.id === jadwal?.mapel_id)?.nama || '-';
      const kelasNama  = r.kelas.find((k: any) => k.id === jadwal?.kelas_id)?.nama || '-';
      const ttd = j.ttd_guru ? `<img src="${j.ttd_guru}" style="height:40px"/>` : '-';
      return `<tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#fff'}">
        <td style="text-align:center">${idx + 1}</td>
        <td>${j.tanggal}</td>
        <td>${mapelNama}</td>
        <td>${kelasNama}</td>
        <td>${jadwal?.hari || '-'}</td>
        <td>${j.materi}</td>
        <td style="font-size:10px;color:#475569">${j.kegiatan_pembelajaran || '-'}</td>
        <td style="text-align:center">${ttd}</td>
      </tr>`;
    }).join('');

    const guruTtd = r.guru?.ttd
      ? `<img src="${r.guru.ttd}" style="height:60px;display:block;margin:0 auto"/>`
      : '<div style="height:60px"></div>';

    return `
      <div style="margin-bottom:40px">
        <div style="margin-bottom:10px">
          <b>Nama Guru</b> : ${r.guru.nama}<br>
          <b>Jumlah Jurnal</b> : ${r.jurnals.length} pertemuan
        </div>
        <table border="1" style="width:100%;border-collapse:collapse;font-size:11px">
          <thead style="background:#f1f5f9">
            <tr>
              <th style="text-align:center;width:30px">No</th>
              <th>Tanggal</th>
              <th>Mapel</th>
              <th>Kelas</th>
              <th>Hari</th>
              <th>Materi</th>
              <th>Kegiatan Pembelajaran</th>
              <th style="text-align:center">TTD</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table style="width:100%;margin-top:24px;text-align:center">
          <tr>
            <td style="width:33%">Mengetahui,<br>Kepala Sekolah<br><br>${
              konfigurasi.ttd_kepsek
                ? `<img src="${konfigurasi.ttd_kepsek}" style="height:60px"/>`
                : '<div style="height:60px"></div>'
            }<br><u>${konfigurasi.nama_kepsek}</u></td>
            <td style="width:33%"></td>
            <td style="width:33%">Guru Mata Pelajaran<br><br>${guruTtd}<br><u>${r.guru.nama}</u></td>
          </tr>
        </table>
      </div>
    `;
  }).join('<hr style="margin:32px 0;border-color:#e2e8f0">');

  printWindow.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Rekap Jurnal — ${konfigurasi.nama_sekolah}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; font-size:12px; color:#1e293b; padding:20px; }
      td,th { padding:4px 8px; border-color:#cbd5e1; }
      @media print { body { padding:0; } }
    </style>
    </head><body>
    <div style="text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:700;text-transform:uppercase">${konfigurasi.nama_sekolah}</div>
      <div style="font-size:12px">${konfigurasi.alamat_sekolah}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:14px;font-weight:700;text-decoration:underline">REKAP JURNAL MENGAJAR</div>
      <div style="font-size:11px;color:#475569">Tahun Ajaran ${konfigurasi.tahun_ajaran} — Semester ${konfigurasi.semester}</div>
      <div style="font-size:11px;color:#475569">Dicetak: ${tanggalCetak}</div>
    </div>
    ${body}
    <script>window.onload = () => { window.print(); }</script>
    </body></html>
  `);
  printWindow.document.close();
}

export default function RekapJurnalAdmin() {
  const [gurus, setGurus]           = useState<any[]>([]);
  const [jadwals, setJadwals]       = useState<any[]>([]);
  const [kelasList, setKelasList]   = useState<any[]>([]);
  const [mapels, setMapels]         = useState<any[]>([]);
  const [filterGuru, setFilterGuru] = useState('');
  const [tanggalMulai, setTanggalMulai]   = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [rekapData, setRekapData]   = useState<any[]>([]);
  const [konfigurasi, setKonfigurasi] = useState<any>({});
  const [loading, setLoading]       = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    db.getGuru().then(setGurus);
    db.getJadwal().then(setJadwals);
    db.getKelas().then(setKelasList);
    db.getMapel().then(setMapels);
    db.getKonfigurasi().then(setKonfigurasi);
  }, []);

  const cariRekap = async () => {
    setLoading(true);
    setShowPreview(false);
    const targetGurus = filterGuru ? gurus.filter(g => String(g.id) === filterGuru) : gurus;
    const result = [];
    for (const g of targetGurus) {
      const jurnals = await db.getJurnalByGuru(g.id, tanggalMulai, tanggalSelesai);
      if (jurnals.length > 0) result.push({ guru: g, jurnals, jadwals, kelas: kelasList, mapels });
    }
    setRekapData(result);
    setLoading(false);
    if (result.length > 0) setShowPreview(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rekap Jurnal Mengajar</h1>
          <p className="text-slate-500 text-sm">Rekap jurnal per guru dalam rentang tanggal</p>
        </div>
        {rekapData.length > 0 && (
          <button onClick={() => generatePDFJurnal(rekapData, konfigurasi)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
            <Download size={16} /> Download PDF
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Guru</label>
            <select value={filterGuru} onChange={e => setFilterGuru(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Guru</option>
              {gurus.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Dari</label>
            <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Sampai</label>
            <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <button onClick={cariRekap} disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-medium text-sm">
          <Eye size={16} /> {loading ? 'Memuat...' : 'Tampilkan & Preview'}
        </button>
      </div>

      {/* Preview */}
      {showPreview && rekapData.map((r, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{r.guru.nama}</h3>
            <span className="text-sm text-slate-500">{r.jurnals.length} jurnal</span>
          </div>
          <div className="divide-y divide-slate-50">
            {r.jurnals.map((j: any) => {
              const jadwal   = jadwals.find(jd => jd.id === j.jadwal_id);
              const mapel    = mapels.find(m => m.id === jadwal?.mapel_id);
              const kelas    = kelasList.find(k => k.id === jadwal?.kelas_id);
              return (
                <div key={j.id} className="px-5 py-3 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-slate-800 text-sm">{j.tanggal}</span>
                      <span className="text-slate-400 text-sm"> — {mapel?.nama} ({kelas?.nama})</span>
                    </div>
                    {j.ttd_guru && <img src={j.ttd_guru} className="h-8" alt="TTD" />}
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-1">{j.materi}</p>
                  {j.kegiatan_pembelajaran && <p className="text-xs text-slate-500 mt-0.5">{j.kegiatan_pembelajaran}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showPreview && rekapData.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => generatePDFJurnal(rekapData, konfigurasi)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium">
            <Download size={16} /> Download PDF Rekap Jurnal
          </button>
        </div>
      )}

      {rekapData.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Klik "Tampilkan & Preview" untuk melihat jurnal.</div>
      )}
    </div>
  );
}
