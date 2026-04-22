import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import { db, Kelas, User } from '../../lib/db';
import Modal from '../../components/Modal';

export default function KelasPage() {
  const [kelas, setKelas]   = useState<Kelas[]>([]);
  const [guru,  setGuru]    = useState<User[]>([]);
  const [siswa, setSiswa]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState<Kelas | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({ nama: '', tahun_ajaran: '2025/2026', wali_kelas_id: '' });

  const load = async () => {
    setLoading(true);
    const [k, g, s] = await Promise.all([db.getKelas(), db.getGuru(), db.getSiswa()]);
    setKelas(k); setGuru(g); setSiswa(s);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ nama: '', tahun_ajaran: '2025/2026', wali_kelas_id: '' });
    setModal(true);
  };
  const openEdit = (k: Kelas) => {
    setEditing(k);
    setForm({ nama: k.nama, tahun_ajaran: k.tahun_ajaran, wali_kelas_id: String(k.wali_kelas_id ?? '') });
    setModal(true);
  };

  const save = async () => {
    if (!form.nama.trim()) return;
    setSaving(true);
    const waliId = form.wali_kelas_id ? Number(form.wali_kelas_id) : null;
    await db.saveKelas({ ...(editing ? { id: editing.id } : {}), nama: form.nama, tahun_ajaran: form.tahun_ajaran, wali_kelas_id: waliId });
    if (waliId) await db.saveGuru({ id: waliId, is_walas: true, kelas_wali_id: editing?.id ?? null } as any);
    setModal(false); setSaving(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus kelas ini?')) return;
    await db.deleteKelas(id); load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-slate-800">Manajemen Kelas</h1><p className="text-slate-500 text-sm">Kelola data kelas sekolah</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium transition-colors">
          <Plus size={18} /> Tambah Kelas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kelas.map((k, i) => {
          const jmlSiswa = siswa.filter(s => s.kelas_id === k.id).length;
          const walas    = guru.find(g => g.id === k.wali_kelas_id);
          return (
            <motion.div key={k.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-600 text-lg">{k.nama.slice(0,2)}</div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(k)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                  <button onClick={() => del(k.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Kelas {k.nama}</h3>
              <p className="text-slate-500 text-sm">TA: {k.tahun_ajaran}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-600 text-sm"><Users size={14} /> {jmlSiswa} Siswa</span>
                <span className="text-xs text-slate-500">Walas: {walas?.nama ?? <span className="text-amber-500">Belum</span>}</span>
              </div>
            </motion.div>
          );
        })}
        {kelas.length === 0 && <p className="col-span-3 text-center py-16 text-slate-400">Belum ada kelas. Tambahkan kelas terlebih dahulu.</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Kelas' : 'Tambah Kelas'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas <span className="text-red-500">*</span></label>
            <input type="text" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="VII A" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
            <input type="text" value={form.tahun_ajaran} onChange={e => setForm({ ...form, tahun_ajaran: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Wali Kelas</label>
            <select value={form.wali_kelas_id} onChange={e => setForm({ ...form, wali_kelas_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">-- Pilih Wali Kelas --</option>
              {guru.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium">
              {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
