// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

export default function SiswaPage() {
  const [siswas, setSiswas] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [pindahModal, setPindahModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  const [filterKelas, setFilterKelas] = useState('');
  const [search, setSearch] = useState('');
  const [pindahKelasId, setPindahKelasId] = useState('');
  const [form, setForm] = useState({ nama: '', nisn: '', alamat: '', nama_ayah: '', nama_ibu: '', kelas_id: '' });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [s, k] = await Promise.all([db.getSiswa(), db.getKelas()]);
    setSiswas(s); setKelasList(k);
  };

  const filtered = siswas.filter(s => {
    const matchKelas = filterKelas ? String(s.kelas_id) === filterKelas : true;
    const matchSearch = search ? s.nama.toLowerCase().includes(search.toLowerCase()) || s.nisn.includes(search) : true;
    return matchKelas && matchSearch;
  });

  const openAdd = () => { setEditing(null); setForm({ nama: '', nisn: '', alamat: '', nama_ayah: '', nama_ibu: '', kelas_id: '' }); setModal(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ nama: s.nama, nisn: s.nisn, alamat: s.alamat || '', nama_ayah: s.nama_ayah || '', nama_ibu: s.nama_ibu || '', kelas_id: s.kelas_id ? String(s.kelas_id) : '' }); setModal(true); };

  const save = async () => {
    if (!form.nama.trim() || !form.nisn.trim()) return;
    await db.saveSiswa({ ...editing, ...form, kelas_id: form.kelas_id ? Number(form.kelas_id) : null });
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus siswa ini?')) return;
    await db.deleteSiswa(id); load();
  };

  const pindahKelas = async () => {
    if (!selectedSiswa || !pindahKelasId) return;
    await db.saveSiswa({ ...selectedSiswa, kelas_id: Number(pindahKelasId) });
    setPindahModal(false); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Siswa</h1>
          <p className="text-slate-500 text-sm">{filtered.length} siswa ditemukan</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
          <Plus size={16} /> Tambah Siswa
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / NISN..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Nama</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">NISN</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kelas</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Poin</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const kelas = kelasList.find(k => k.id === s.kelas_id);
              const poinColor = s.poin >= 80 ? 'text-emerald-600' : s.poin >= 60 ? 'text-amber-600' : 'text-red-600';
              return (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-sm">{s.nama[0]}</div>
                      <span className="font-medium text-slate-800 text-sm">{s.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{s.nisn}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{kelas?.nama || '-'}</td>
                  <td className="px-4 py-3"><span className={`font-bold text-sm ${poinColor}`}>{s.poin}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={14} /></button>
                      <button onClick={() => { setSelectedSiswa(s); setPindahKelasId(s.kelas_id ? String(s.kelas_id) : ''); setPindahModal(true); }} className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg"><ArrowRight size={14} /></button>
                      <button onClick={() => del(s.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Belum ada data siswa.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Siswa' : 'Tambah Siswa'}>
        <div className="space-y-3">
          {[['nama','Nama Lengkap','Nama siswa'],['nisn','NISN','0012345678'],['alamat','Alamat','Jl. ...'],['nama_ayah','Nama Ayah',''],['nama_ibu','Nama Ibu','']].map(([field, label, ph]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={ph}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
            <select value={form.kelas_id} onChange={e => setForm({ ...form, kelas_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={save} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>

      <Modal open={pindahModal} onClose={() => setPindahModal(false)} title={`Pindah Kelas: ${selectedSiswa?.nama}`}>
        <div className="space-y-4">
          <select value={pindahKelasId} onChange={e => setPindahKelasId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">-- Pilih Kelas Tujuan --</option>
            {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={() => setPindahModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600">Batal</button>
            <button onClick={pindahKelas} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">Pindahkan</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
