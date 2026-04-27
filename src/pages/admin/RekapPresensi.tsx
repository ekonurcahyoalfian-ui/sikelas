// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Eye, X, Printer } from 'lucide-react';
import { db } from '../../lib/db';

// ─── Helper PDF ───────────────────────────────────────────
function generatePDFPresensi(rekapData: any[], konfigurasi: any, siswas: any[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tanggalCetak = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });

  const rows = rekapData.map(r => {
    // Kumpulkan semua siswa unik dari presensi
    const siswaIds = [...new Set(r.presensi.map((p: any) => p.siswa_id))];
    const tanggals = [...new Set(r.presensi.map((p: any) => p.tanggal))].sort();

    const tbody = siswaIds.map((sid, idx) => {
      const siswa = siswas.find(s => s.id === sid);
      const cols = tanggals.map(tgl => {
        const p = r.presensi.find((x: any) => x.siswa_id === sid && x.tanggal === tgl);
        const status = p?.status || '-';
        const color = status === 'Hadir' ? '#16a34a' : status === 'Alpa' ? '#dc2626' : status === 'Izin' ? '#2563eb' : '#d97706';
        return `<td style="text-align:center;color:${color};font-weight:600;font-size:11px">${status === 'Hadir' ? 'H' : status === 'Izin' ? 'I' : status === 'Sakit' ? 'S' : status === 'Alpa' ? 'A' : '-'}</td>`;
      }).join('');
      const hadir = r.presensi.filter((p: any) => p.siswa_id === sid && p.status === 'Hadir').length;
      const alpa  = r.presensi.filter((p: any) => p.siswa_id === sid && p.status === 'Alpa').length;
      return `<tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#fff'}">
        <td style="text-align:center">${idx + 1}</td>
        <td>${siswa?.nama || sid}</td>
        <td style="font-family:monospace">${siswa?.nisn || '-'}</td>
        ${cols}
        <td style="text-align:center;font-weight:700;color:#16a34a">${hadir}</td>
        <td style="text-align:center;font-weight:700;color:#dc2626">${alpa}</td>
      </tr>`;
    }).join('');

    const tglHeaders = tanggals.map(t => {
      const d = new Date(t + 'T12:00:00');
      return `<th style="text-align:center;min-width:30px;font-size:10px">${d.getDate()}/${d.getMonth()+1}</th>`;
    }).join('');

    const guruTtd = r.guru?.ttd
      ? `<img src="${r.guru.ttd}" style="height:60px;display:block;margin:0 auto"/>`
      : '<div style="height:60px"></div>';

    return `
      <div style="margin-bottom:32px">
        <table style="width:100%;margin-bottom:6px">
          <tr>
            <td><b>Mata Pelajaran</b> : ${r.mapel?.nama || '-'}</td>
            <td><b>Kelas</b> : ${r.kelas?.nama || '-'}</td>
          </tr>
          <tr>
            <td><b>Guru</b> : ${r.guru?.nama || '-'}</td>
            <td><b>Hari</b> : ${r.jadwal?.hari || '-'} (${r.jadwal?.jam_mulai}–${r.jadwal?.jam_selesai})</td>
          </tr>
        </table>
        <table border="1" style="width:100%;border-collapse:collapse;font-size:11px">
          <thead style="background:#f1f5f9">
            <tr>
              <th rowspan="2" style="text-align:center;width:30px">No</th>
              <th rowspan="2" style="text-align:left">Nama Siswa</th>
              <th rowspan="2" style="text-align:center">NISN</th>
              <th colspan="${tanggals.length}" style="text-align:center">Tanggal</th>
              <th rowspan="2" style="text-align:center">H</th>
              <th rowspan="2" style="text-align:center">A</th>
            </tr>
            <tr>${tglHeaders}</tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
        <table style="width:100%;margin-top:24px;text-align:center">
          <tr>
            <td style="width:33%">Mengetahui,<br>Kepala Sekolah<br><br>${
              konfigurasi.ttd_kepsek
                ? `<img src="${konfigurasi.ttd_kepsek}" style="height:60px"/>`
                : '<div style="height:60px"></div>'
            }<br><u>${konfigurasi.nama_kepsek}</u></td>
            <td style="width:33%">Wali Kelas<br><br><div style="height:60px"></div><br><u>${r.waliKelas?.nama || '........................'}</u></td>
            <td style="width:33%">Guru Mata Pelajaran<br><br>${guruTtd}<br><u>${r.guru?.nama || '........................'}</u></td>
          </tr>
        </table>
      </div>
    `;
  }).join('<hr style="margin:32px 0;border-color:#e2e8f0">');

  printWindow.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Rekap Presensi — ${konfigurasi.nama_sekolah}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 20px; }
      table { border-spacing: 0; }
      td, th { padding: 4px 8px; border-color: #cbd5e1; }
      @media print { body { padding: 0; } }
    </style>
    </head><body>
    <!-- KOP SURAT -->
    <div style="text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:700;text-transform:uppercase">${konfigurasi.nama_sekolah}</div>
      <div style="font-size:12px">${konfigurasi.alamat_sekolah}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:14px;font-weight:700;text-decoration:underline">REKAP PRESENSI SISWA</div>
      <div style="font-size:11px;color:#475569">Tahun Ajaran ${konfigurasi.tahun_ajaran} — Semester ${konfigurasi.semester}</div>
      <div style="font-size:11px;color:#475569">Dicetak: ${tanggalCetak}</div>
    </div>
    ${rows}
    <script>window.onload = () => { window.print(); }</script>
    </body></html>
  `);
  printWindow.document.close();
}

export default function RekapPresensiAdmin() {
  const [kelasList, setKelasList]   = useState<any[]>([]);
  const [gurus, setGurus]           = useState<any[]>([]);
  const [mapels, setMapels]         = useState<any[]>([]);
  const [jadwals, setJadwals]       = useState<any[]>([]);
  const [siswas, setSiswas]         = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterGuru, setFilterGuru]   = useState('');
  const [tanggalMulai, setTanggalMulai]   = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [rekapData, setRekapData]   = useState<any[]>([]);
  const [konfigurasi, setKonfigurasi] = useState<any>({});
  const [loading, setLoading]       = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    db.getKelas().then(setKelasList);
    db.getGuru().then(setGurus);
    db.getMapel().then(setMapels);
    db.getJadwal().then(setJadwals);
    db.getSiswa().then(setSiswas);
    db.getKonfigurasi().then(setKonfigurasi);
  }, []);

  const cariRekap = async () => {
    setLoading(true);
    setShowPreview(false);
    const filteredJadwal = jadwals.filter(j => {
      if (filterKelas && String(j.kelas_id) !== filterKelas) return false;
      if (filterGuru && String(j.guru_id) !== filterGuru) return false;
      return true;
    });
    const result = [];
    for (const j of filteredJadwal) {
      const presensi = await db.getPresensiByRange(j.id, tanggalMulai, tanggalSelesai);
      if (presensi.length > 0) {
        const kelas    = kelasList.find(k => k.id === j.kelas_id);
        const mapel    = mapels.find(m => m.id === j.mapel_id);
        const guru     = gurus.find(g => g.id === j.guru_id);
        const waliKelas = gurus.find(g => g.kelas_wali_id === j.kelas_id);
        result.push({ jadwal: j, kelas, mapel, guru, waliKelas, presensi });
      }
    }
    setRekapData(result);
    setLoading(false);
    if (result.length > 0) setShowPreview(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rekap Presensi</h1>
          <p className="text-slate-500 text-sm">Lihat dan download rekap presensi</p>
        </div>
        {rekapData.length > 0 && (
          <button onClick={() => generatePDFPresensi(rekapData, konfigurasi, siswas)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
            <Download size={16} /> Download PDF
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Kelas</label>
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Kelas</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
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

      {/* Preview rekap */}
      {showPreview && rekapData.length > 0 && (
        <div className="space-y-4">
          {rekapData.map((r, i) => {
            const siswaIds = [...new Set(r.presensi.map((p: any) => p.siswa_id))];
            const tanggals = [...new Set(r.presensi.map((p: any) => p.tanggal))].sort() as string[];
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800">{r.mapel?.nama} — {r.kelas?.nama}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Guru: {r.guru?.nama} | {r.jadwal.hari} {r.jadwal.jam_mulai}–{r.jadwal.jam_selesai}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(['Hadir','Izin','Sakit','Alpa'] as const).map((s, si) => {
                        const colors = ['bg-emerald-100 text-emerald-700','bg-blue-100 text-blue-700','bg-amber-100 text-amber-700','bg-red-100 text-red-700'];
                        const count  = r.presensi.filter((p: any) => p.status === s).length;
                        return <span key={s} className={`px-2 py-1 rounded text-xs font-medium ${colors[si]}`}>{s}: {count}</span>;
                      })}
                    </div>
                  </div>
                </div>
                {/* Tabel presensi */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-slate-600">Nama Siswa</th>
                        {tanggals.map(t => (
                          <th key={t} className="text-center px-2 py-2 font-semibold text-slate-600 min-w-[50px]">
                            {new Date(t + 'T12:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </th>
                        ))}
                        <th className="text-center px-2 py-2 font-semibold text-emerald-600">H</th>
                        <th className="text-center px-2 py-2 font-semibold text-red-600">A</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaIds.map((sid, idx) => {
                        const siswa = siswas.find(s => s.id === sid);
                        const hadir = r.presensi.filter((p: any) => p.siswa_id === sid && p.status === 'Hadir').length;
                        const alpa  = r.presensi.filter((p: any) => p.siswa_id === sid && p.status === 'Alpa').length;
                        return (
                          <tr key={String(sid)} className={idx % 2 === 0 ? 'bg-slate-50/50' : ''}>
                            <td className="px-4 py-2 font-medium text-slate-800">{siswa?.nama || String(sid)}</td>
                            {tanggals.map(t => {
                              const p = r.presensi.find((x: any) => x.siswa_id === sid && x.tanggal === t);
                              const s = p?.status;
                              const badge = s === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : s === 'Izin' ? 'bg-blue-100 text-blue-700' : s === 'Sakit' ? 'bg-amber-100 text-amber-700' : s === 'Alpa' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400';
                              const label = s === 'Hadir' ? 'H' : s === 'Izin' ? 'I' : s === 'Sakit' ? 'S' : s === 'Alpa' ? 'A' : '-';
                              return <td key={t} className="text-center px-2 py-2"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${badge}`}>{label}</span></td>;
                            })}
                            <td className="text-center px-2 py-2 font-bold text-emerald-600">{hadir}</td>
                            <td className="text-center px-2 py-2 font-bold text-red-600">{alpa}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Tombol download di bawah */}
          <div className="flex justify-end">
            <button onClick={() => generatePDFPresensi(rekapData, konfigurasi, siswas)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium">
              <Download size={16} /> Download PDF Rekap Presensi
            </button>
          </div>
        </div>
      )}

      {rekapData.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Klik "Tampilkan & Preview" untuk melihat data presensi.</div>
      )}
    </div>
  );
}
