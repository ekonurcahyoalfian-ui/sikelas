// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

export default function MapelKelasPage() {
  const [mapelKelas, setMapelKelas] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [filterKelas, setFilterKelas] = useState('');
  const [form, setForm] = useState({ kelas_id: '', mapel_id: '', guru_id: '' });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [mk, k, m, g] = await Promise.all([db.getMapelKelas(), db.getKelas(), db.getMapel(), db.getGuru()]);
    setMapelKelas(mk); setKelasList(k); setMapels(m); setGurus(g);
  };

  const filtered = filterKelas ? mapelKelas.filter(mk => String(mk.kelas_id) === filterKelas) : mapelKelas;

  const save = async () => {
    if (!form.kelas_id || !form.mapel_id || !form.guru_id) return;
    await db.saveMapelKelas({ kelas_id: Number(form.kelas_id), mapel_id: Number(form.mapel_id), guru_id: Number(form.guru_id) });
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus mapel dari kelas ini?')) return;
    await db.deleteMapelKelas(id); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mapel per Kelas</h1>
          <p className="text-slate-500 text-sm">Atur mata pelajaran dan guru pengampu tiap kelas</p>
        </div>
        <button onClick={() => { setForm({ kelas_id: '', mapel_id: '', guru_id: '' }); setModal(true); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
          <Plus size={16} /> Tambah
        </button>
      </div>

      <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <option value="">Semua Kelas</option>
        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
      </select>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kelas</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Mata Pelajaran</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Guru Pengampu</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((mk, i) => {
              const kelas = kelasList.find(k => k.id === mk.kelas_id);
              const mapel = mapels.find(m => m.id === mk.mapel_id);
              const guru = gurus.find(g => g.id === mk.guru_id);
              return (
                <tr key={mk.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{kelas?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{mapel?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{guru?.nama || '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => del(mk.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Belum ada data.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Tambah Mapel ke Kelas">
        <div className="space-y-4">
          {[['kelas_id','Kelas',kelasList],['mapel_id','Mata Pelajaran',mapels],['guru_id','Guru Pengampu',gurus]].map(([field, label, list]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <select value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Pilih --</option>
                {list.map((item: any) => <option key={item.id} value={item.id}>{item.nama}</option>)}
              </select>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600">Batal</button>
            <button onClick={save} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
