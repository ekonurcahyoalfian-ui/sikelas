// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

export default function MapelPage() {
  const [mapels, setMapels] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nama: '', kode: '', jp_per_pekan: 2 });

  useEffect(() => { load(); }, []);
  const load = async () => setMapels(await db.getMapel());

  const openAdd = () => { setEditing(null); setForm({ nama: '', kode: '', jp_per_pekan: 2 }); setModal(true); };
  const openEdit = (m: any) => { setEditing(m); setForm({ nama: m.nama, kode: m.kode, jp_per_pekan: m.jp_per_pekan }); setModal(true); };

  const save = async () => {
    if (!form.nama.trim()) return;
    await db.saveMapel(editing ? { ...editing, ...form } : form);
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus mata pelajaran ini?')) return;
    await db.deleteMapel(id); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mata Pelajaran</h1>
          <p className="text-slate-500 text-sm">Kelola data mata pelajaran</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
          <Plus size={16} /> Tambah Mapel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mapels.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{m.kode || '-'}</span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(m)} className="p-1 text-slate-400 hover:text-blue-600"><Edit size={13} /></button>
                <button onClick={() => del(m.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
            <h4 className="font-semibold text-slate-800 mb-1">{m.nama}</h4>
            <p className="text-xs text-slate-500">{m.jp_per_pekan} JP/pekan</p>
          </motion.div>
        ))}
        {mapels.length === 0 && <div className="col-span-3 text-center py-12 text-slate-400">Belum ada mata pelajaran.</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Mapel' : 'Tambah Mapel'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Mata Pelajaran</label>
            <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Matematika"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kode</label>
            <input value={form.kode} onChange={e => setForm({ ...form, kode: e.target.value })} placeholder="MTK"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">JP per Pekan</label>
            <input type="number" min={1} value={form.jp_per_pekan} onChange={e => setForm({ ...form, jp_per_pekan: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={save} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
