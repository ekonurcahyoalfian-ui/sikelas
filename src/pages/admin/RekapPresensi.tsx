// @ts-nocheck
import { useState, useEffect } from 'react';
import { db } from '../../lib/db';

export default function RekapPresensiAdmin() {
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [jadwals, setJadwals] = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterGuru, setFilterGuru] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [rekapData, setRekapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadMaster(); }, []);
  const loadMaster = async () => {
    const [k, g, m, j] = await Promise.all([db.getKelas(), db.getGuru(), db.getMapel(), db.getJadwal()]);
    setKelasList(k); setGurus(g); setMapels(m); setJadwals(j);
  };

  const cariRekap = async () => {
    setLoading(true);
    const filteredJadwal = jadwals.filter(j => {
      if (filterKelas && String(j.kelas_id) !== filterKelas) return false;
      if (filterGuru && String(j.guru_id) !== filterGuru) return false;
      return true;
    });
    const result = [];
    for (const j of filteredJadwal) {
      const presensi = await db.getPresensiByRange(j.id, tanggalMulai, tanggalSelesai);
      if (presensi.length > 0) {
        const kelas = kelasList.find(k => k.id === j.kelas_id);
        const mapel = mapels.find(m => m.id === j.mapel_id);
        const guru = gurus.find(g => g.id === j.guru_id);
        result.push({ jadwal: j, kelas, mapel, guru, presensi });
      }
    }
    setRekapData(result);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rekap Presensi</h1>
        <p className="text-slate-500 text-sm">Lihat rekap presensi berdasarkan filter</p>
      </div>

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
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-medium text-sm">
          {loading ? 'Memuat...' : 'Tampilkan Rekap'}
        </button>
      </div>

      {rekapData.length > 0 && (
        <div className="space-y-4">
          {rekapData.map((r, i) => {
            const hadir = r.presensi.filter((p: any) => p.status === 'Hadir').length;
            const izin = r.presensi.filter((p: any) => p.status === 'Izin').length;
            const sakit = r.presensi.filter((p: any) => p.status === 'Sakit').length;
            const alpa = r.presensi.filter((p: any) => p.status === 'Alpa').length;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{r.mapel?.nama} — {r.kelas?.nama}</h3>
                    <p className="text-xs text-slate-500">Guru: {r.guru?.nama} | {r.jadwal.hari} {r.jadwal.jam_mulai}–{r.jadwal.jam_selesai}</p>
                  </div>
                  <span className="text-sm text-slate-500">{r.presensi.length} data</span>
                </div>
                <div className="flex gap-3">
                  {[['Hadir', hadir, 'bg-emerald-100 text-emerald-700'],['Izin', izin, 'bg-blue-100 text-blue-700'],['Sakit', sakit, 'bg-amber-100 text-amber-700'],['Alpa', alpa, 'bg-red-100 text-red-700']].map(([label, val, color]) => (
                    <div key={label} className={`${color} px-3 py-1.5 rounded-lg text-xs font-medium`}>{label}: {val}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {rekapData.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Klik "Tampilkan Rekap" untuk melihat data presensi.</div>
      )}
    </div>
  );
}
