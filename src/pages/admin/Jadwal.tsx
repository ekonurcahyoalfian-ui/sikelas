// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalPage() {
  const [jadwals, setJadwals] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterHari, setFilterHari] = useState('');
  const [form, setForm] = useState({ kelas_id: '', mapel_id: '', guru_id: '', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '07:45' });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [j, k, m, g] = await Promise.all([db.getJadwal(), db.getKelas(), db.getMapel(), db.getGuru()]);
    setJadwals(j); setKelasList(k); setMapels(m); setGurus(g);
  };

  const filtered = jadwals.filter(j => {
    if (filterKelas && String(j.kelas_id) !== filterKelas) return false;
    if (filterHari && j.hari !== filterHari) return false;
    return true;
  });

  const openAdd = () => { setEditing(null); setForm({ kelas_id: '', mapel_id: '', guru_id: '', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '07:45' }); setModal(true); };
  const openEdit = (j: any) => { setEditing(j); setForm({ kelas_id: String(j.kelas_id), mapel_id: String(j.mapel_id), guru_id: String(j.guru_id), hari: j.hari, jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai }); setModal(true); };

  const save = async () => {
    if (!form.kelas_id || !form.mapel_id || !form.guru_id) return;
    await db.saveJadwal({ ...editing, ...form, kelas_id: Number(form.kelas_id), mapel_id: Number(form.mapel_id), guru_id: Number(form.guru_id) });
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return;
    await db.deleteJadwal(id); load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jadwal Pelajaran</h1>
          <p className="text-slate-500 text-sm">Kelola jadwal pelajaran semua kelas</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm">
          <Plus size={16} /> Tambah Jadwal
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select value={filterHari} onChange={e => setFilterHari(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Hari</option>
          {HARI.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Hari</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Waktu</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kelas</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Mapel</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Guru</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j, i) => {
              const kelas = kelasList.find(k => k.id === j.kelas_id);
              const mapel = mapels.find(m => m.id === j.mapel_id);
              const guru = gurus.find(g => g.id === j.guru_id);
              return (
                <motion.tr key={j.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{j.hari}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-600 flex items-center gap-1"><Clock size={13} /> {j.jam_mulai} – {j.jam_selesai}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{kelas?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{mapel?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{guru?.nama || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(j)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={14} /></button>
                      <button onClick={() => del(j.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Belum ada jadwal.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Jadwal' : 'Tambah Jadwal'}>
        <div className="space-y-4">
          {[['kelas_id','Kelas',kelasList],['mapel_id','Mapel',mapels],['guru_id','Guru',gurus]].map(([field, label, list]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <select value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Pilih {label} --</option>
                {list.map((item: any) => <option key={item.id} value={item.id}>{item.nama}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hari</label>
            <select value={form.hari} onChange={e => setForm({ ...form, hari: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {HARI.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
              <input type="time" value={form.jam_mulai} onChange={e => setForm({ ...form, jam_mulai: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
              <input type="time" value={form.jam_selesai} onChange={e => setForm({ ...form, jam_selesai: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
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
