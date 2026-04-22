// @ts-nocheck
import { useState, useEffect } from 'react';
import { db } from '../../lib/db';

export default function RekapNilaiAdmin() {
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [siswas, setSiswas] = useState<any[]>([]);
  const [nilaiAll, setNilaiAll] = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadMaster(); }, []);
  const loadMaster = async () => {
    const [k, m] = await Promise.all([db.getKelas(), db.getMapel()]);
    setKelasList(k); setMapels(m);
  };

  const loadNilai = async (kelasId: string) => {
    setLoading(true);
    const [sw, nl] = await Promise.all([
      db.getSiswa(kelasId ? Number(kelasId) : undefined),
      db.getNilaiByKelas(Number(kelasId)),
    ]);
    setSiswas(sw); setNilaiAll(nl);
    setLoading(false);
  };

  const handleFilterKelas = (id: string) => {
    setFilterKelas(id);
    if (id) loadNilai(id);
    else { setSiswas([]); setNilaiAll([]); }
  };

  const getNilaiSiswa = (siswaId: number, mapelId: number) =>
    nilaiAll.find(n => n.siswa_id === siswaId && n.mapel_id === mapelId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rekap Nilai</h1>
        <p className="text-slate-500 text-sm">Lihat rekap nilai per kelas</p>
      </div>

      <select value={filterKelas} onChange={e => handleFilterKelas(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <option value="">-- Pilih Kelas --</option>
        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
      </select>

      {loading && <div className="text-center py-10 text-slate-400">Memuat data...</div>}

      {!loading && filterKelas && siswas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Siswa</th>
                {mapels.map(m => <th key={m.id} className="px-3 py-3 font-semibold text-slate-600 text-center">{m.nama}</th>)}
              </tr>
            </thead>
            <tbody>
              {siswas.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.nama}</td>
                  {mapels.map(m => {
                    const n = getNilaiSiswa(s.id, m.id);
                    const akhir = n ? ((( n.nilai_asts || 0) + (n.nilai_asas || 0)) / 2).toFixed(1) : '-';
                    return <td key={m.id} className="px-3 py-3 text-center text-slate-600">{akhir}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !filterKelas && (
        <div className="text-center py-12 text-slate-400 text-sm">Pilih kelas untuk melihat rekap nilai.</div>
      )}
    </div>
  );
}
