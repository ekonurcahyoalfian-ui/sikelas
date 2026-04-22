// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';
import SignaturePad from '../../components/SignaturePad';

export default function GuruPage() {
  const [gurus, setGurus] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ nama: '', username: '', password: '', is_walas: false, kelas_wali_id: '', ttd: '' });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [g, k] = await Promise.all([db.getGuru(), db.getKelas()]);
    setGurus(g); setKelasList(k);
  };

  const openAdd = () => { setEditing(null); setForm({ nama: '', username: '', password: '', is_walas: false, kelas_wali_id: '', ttd: '' }); setModal(true); };
  const openEdit = (g: any) => { setEditing(g); setForm({ nama: g.nama, username: g.username, password: '', is_walas: g.is_walas || false, kelas_wali_id: g.kelas_wali_id || '', ttd: g.ttd || '' }); setModal(true); };

  const save = async () => {
    if (!form.nama.trim() || !form.username.trim()) return;
    await db.saveGuru({ ...editing, ...form, kelas_wali_id: form.kelas_wali_id ? Number(form.kelas_wali_id) : null });
    setModal(false); setMsg('Tersimpan!'); setTimeout(() => setMsg(''), 2000); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus guru ini?')) return;
    await db.deleteGuru(id); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Guru</h1>
          <p className="text-slate-500 text-sm">Kelola data guru dan wali kelas</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
          <Plus size={16} /> Tambah Guru
        </button>
      </div>
      {msg && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">{msg}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Nama</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Username</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Wali Kelas</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {gurus.map((g, i) => {
              const kelas = kelasList.find(k => k.id === g.kelas_wali_id);
              return (
                <motion.tr key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm">{g.nama[0]}</div>
                      <span className="font-medium text-slate-800 text-sm">{g.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{g.username}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{g.is_walas ? (kelas?.nama || 'Ya') : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(g)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={14} /></button>
                      <button onClick={() => del(g.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {gurus.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Belum ada data guru.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Guru' : 'Tambah Guru'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Nama guru"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="username"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">{editing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? '(tidak diubah)' : 'guru123'}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="walas" checked={form.is_walas} onChange={e => setForm({ ...form, is_walas: e.target.checked })} />
            <label htmlFor="walas" className="text-sm text-slate-700">Wali Kelas</label>
          </div>
          {form.is_walas && (
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Kelas Wali</label>
              <select value={form.kelas_wali_id} onChange={e => setForm({ ...form, kelas_wali_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select></div>
          )}
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Tanda Tangan Digital</label>
            <SignaturePad value={form.ttd} onChange={ttd => setForm({ ...form, ttd })} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={save} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
