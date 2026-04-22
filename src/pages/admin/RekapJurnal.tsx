// @ts-nocheck
import { useState, useEffect } from 'react';
import { db } from '../../lib/db';

export default function RekapJurnalAdmin() {
  const [gurus, setGurus] = useState<any[]>([]);
  const [jadwals, setJadwals] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [filterGuru, setFilterGuru] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);
  const [rekapData, setRekapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadMaster(); }, []);
  const loadMaster = async () => {
    const [g, j, k, m] = await Promise.all([db.getGuru(), db.getJadwal(), db.getKelas(), db.getMapel()]);
    setGurus(g); setJadwals(j); setKelasList(k); setMapels(m);
  };

  const cariRekap = async () => {
    setLoading(true);
    const targetGurus = filterGuru ? gurus.filter(g => String(g.id) === filterGuru) : gurus;
    const result = [];
    for (const g of targetGurus) {
      const jurnals = await db.getJurnalByGuru(g.id, tanggalMulai, tanggalSelesai);
      if (jurnals.length > 0) result.push({ guru: g, jurnals });
    }
    setRekapData(result);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rekap Jurnal Mengajar</h1>
        <p className="text-slate-500 text-sm">Rekap jurnal per guru dalam rentang tanggal</p>
      </div>

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
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-medium text-sm">
          {loading ? 'Memuat...' : 'Tampilkan Rekap'}
        </button>
      </div>

      {rekapData.map((r, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{r.guru.nama}</h3>
            <span className="text-sm text-slate-500">{r.jurnals.length} jurnal</span>
          </div>
          <div className="divide-y divide-slate-50">
            {r.jurnals.map((j: any) => {
              const jadwal = jadwals.find(jd => jd.id === j.jadwal_id);
              const mapel = mapels.find(m => m.id === jadwal?.mapel_id);
              const kelas = kelasList.find(k => k.id === jadwal?.kelas_id);
              return (
                <div key={j.id} className="px-5 py-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{j.tanggal} — {mapel?.nama} ({kelas?.nama})</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{j.materi}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {rekapData.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Klik "Tampilkan Rekap" untuk melihat jurnal.</div>
      )}
    </div>
  );
}
