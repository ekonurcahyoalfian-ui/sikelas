// @ts-nocheck
import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { db } from '../../lib/db';
import type { AppUser as User } from '../../App';

export default function NilaiGuru({ user }: { user: User }) {
  const [jadwals, setJadwals] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [siswas, setSiswas] = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
  const [nilaiData, setNilaiData] = useState<Record<number, any>>({});
  const [konfigurasi, setKonfigurasi] = useState<any>({ semester: 'Ganjil' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [j, k, m, cfg] = await Promise.all([db.getJadwal({ guruId: user.id }), db.getKelas(), db.getMapel(), db.getKonfigurasi()]);
      setJadwals(j); setKelasList(k); setMapels(m); setKonfigurasi(cfg);
    };
    load();
  }, []);

  // Load siswa & nilai saat filter berubah
  useEffect(() => {
    if (!filterKelas || !filterMapel) { setSiswas([]); return; }
    const load = async () => {
      const sw = await db.getSiswa(Number(filterKelas));
      setSiswas(sw);
      // Load nilai per siswa
      const nd: Record<number, any> = {};
      for (const s of sw) {
        const n = await db.getNilai(s.id, Number(filterMapel));
        let nilaiHarian: number[] = [];
        if (n?.id) {
          const nh = await db.getNilaiHarian(n.id);
          nilaiHarian = nh.map((h: any) => h.nilai);
        }
        nd[s.id] = n ? { ...n, nilaiHarian } : { siswa_id: s.id, mapel_id: Number(filterMapel), kelas_id: Number(filterKelas), semester: konfigurasi.semester, nilai_asts: null, nilai_asas: null, nilaiHarian: [] };
      }
      setNilaiData(nd);
    };
    load();
  }, [filterKelas, filterMapel]);

  const kelasFromJadwal = [...new Map(jadwals.map(j => [j.kelas_id, kelasList.find(k => k.id === j.kelas_id)])).values()].filter(Boolean);
  const mapelFromJadwal = [...new Map(jadwals.filter(j => !filterKelas || String(j.kelas_id) === filterKelas).map(j => [j.mapel_id, mapels.find(m => m.id === j.mapel_id)])).values()].filter(Boolean);

  const addNilaiHarian = (siswaId: number) => {
    setNilaiData(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], nilaiHarian: [...(prev[siswaId]?.nilaiHarian || []), 0] } }));
  };

  const setNilaiHarian = (siswaId: number, idx: number, val: number) => {
    setNilaiData(prev => {
      const nh = [...(prev[siswaId]?.nilaiHarian || [])];
      nh[idx] = val;
      return { ...prev, [siswaId]: { ...prev[siswaId], nilaiHarian: nh } };
    });
  };

  const removeNilaiHarian = (siswaId: number, idx: number) => {
    setNilaiData(prev => {
      const nh = [...(prev[siswaId]?.nilaiHarian || [])];
      nh.splice(idx, 1);
      return { ...prev, [siswaId]: { ...prev[siswaId], nilaiHarian: nh } };
    });
  };

  const save = async () => {
    setLoading(true);
    for (const s of siswas) {
      const nd = nilaiData[s.id];
      if (!nd) continue;
      const saved = await db.upsertNilai({ siswa_id: s.id, mapel_id: Number(filterMapel), kelas_id: Number(filterKelas), semester: konfigurasi.semester, nilai_asts: nd.nilai_asts, nilai_asas: nd.nilai_asas });
      if (saved?.id) {
        await db.deleteNilaiHarian(saved.id);
        for (let i = 0; i < nd.nilaiHarian.length; i++) {
          await db.insertNilaiHarian({ nilai_id: saved.id, nilai: nd.nilaiHarian[i], urutan: i + 1 });
        }
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Input Nilai</h1>
        <p className="text-slate-500 text-sm">Input nilai harian, ASTS, dan ASAS</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterKelas} onChange={e => { setFilterKelas(e.target.value); setFilterMapel(''); }}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">-- Pilih Kelas --</option>
          {kelasFromJadwal.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select value={filterMapel} onChange={e => setFilterMapel(e.target.value)} disabled={!filterKelas}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50">
          <option value="">-- Pilih Mapel --</option>
          {mapelFromJadwal.map((m: any) => <option key={m.id} value={m.id}>{m.nama}</option>)}
        </select>
      </div>

      {siswas.length > 0 && (
        <>
          <div className="space-y-3">
            {siswas.map(s => {
              const nd = nilaiData[s.id] || { nilaiHarian: [], nilai_asts: null, nilai_asas: null };
              const rataHarian = nd.nilaiHarian.length > 0 ? (nd.nilaiHarian.reduce((a: number, b: number) => a + b, 0) / nd.nilaiHarian.length) : 0;
              const nilaiAkhir = ((rataHarian + (nd.nilai_asts || 0) + (nd.nilai_asas || 0)) / 3).toFixed(1);
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-800">{s.nama}</span>
                    <span className="text-sm font-bold text-emerald-600">Rata: {nilaiAkhir}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">ASTS</label>
                      <input type="number" min={0} max={100} value={nd.nilai_asts || ''} onChange={e => setNilaiData(prev => ({ ...prev, [s.id]: { ...prev[s.id], nilai_asts: Number(e.target.value) } }))}
                        placeholder="0–100" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">ASAS</label>
                      <input type="number" min={0} max={100} value={nd.nilai_asas || ''} onChange={e => setNilaiData(prev => ({ ...prev, [s.id]: { ...prev[s.id], nilai_asas: Number(e.target.value) } }))}
                        placeholder="0–100" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-500">Nilai Harian</label>
                      <button onClick={() => addNilaiHarian(s.id)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                        <Plus size={12} /> Tambah
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {nd.nilaiHarian.map((val: number, idx: number) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input type="number" min={0} max={100} value={val} onChange={e => setNilaiHarian(s.id, idx, Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-slate-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          <button onClick={() => removeNilaiHarian(s.id, idx)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                      ))}
                      {nd.nilaiHarian.length === 0 && <span className="text-xs text-slate-400">Belum ada nilai harian</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {saved && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">✅ Nilai berhasil disimpan!</div>}
          <button onClick={save} disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3 rounded-xl font-medium">
            <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Semua Nilai'}
          </button>
        </>
      )}
      {!filterKelas && <div className="text-center py-10 text-slate-400 text-sm">Pilih kelas dan mapel untuk mulai input nilai.</div>}
    </div>
  );
}
