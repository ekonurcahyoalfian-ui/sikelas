// @ts-nocheck
import { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import { db } from '../../lib/db';
import type { AppUser as User } from '../../App';
import Modal from '../../components/Modal';
import SignaturePad from '../../components/SignaturePad';

export default function JurnalGuru({ user }: { user: User }) {
  const [jurnals, setJurnals] = useState<any[]>([]);
  const [jadwals, setJadwals] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);
  const [editModal, setEditModal] = useState(false);
  const [editingJurnal, setEditingJurnal] = useState<any>(null);
  const [editForm, setEditForm] = useState({ materi: '', kegiatan_pembelajaran: '', ttd_guru: '' });
  const [tanggalMulai, setTanggalMulai] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadMaster(); }, []);
  useEffect(() => { loadJurnal(); }, [tanggalMulai, tanggalSelesai]);

  const loadMaster = async () => {
    const [j, k, m] = await Promise.all([db.getJadwal({ guruId: user.id }), db.getKelas(), db.getMapel()]);
    setJadwals(j); setKelasList(k); setMapels(m);
  };

  const loadJurnal = async () => {
    const list = await db.getJurnalByGuru(user.id, tanggalMulai, tanggalSelesai);
    setJurnals(list);
  };

  const openEdit = (j: any) => {
    setEditingJurnal(j);
    setEditForm({ materi: j.materi, kegiatan_pembelajaran: j.kegiatan_pembelajaran || '', ttd_guru: j.ttd_guru || '' });
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingJurnal) return;
    await db.updateJurnal(editingJurnal.id, editForm);
    setEditModal(false);
    loadJurnal();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jurnal Mengajar</h1>
          <p className="text-slate-500 text-sm">Riwayat dan edit jurnal mengajar</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Dari</label>
          <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Sampai</label>
          <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      <div className="space-y-3">
        {jurnals.map(j => {
          const jadwal = jadwals.find(jd => jd.id === j.jadwal_id);
          const mapel = mapels.find(m => m.id === jadwal?.mapel_id);
          const kelas = kelasList.find(k => k.id === jadwal?.kelas_id);
          return (
            <div key={j.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-slate-800 text-sm">{j.tanggal}</span>
                  <span className="text-slate-400 text-sm"> — {mapel?.nama} ({kelas?.nama})</span>
                </div>
                <button onClick={() => openEdit(j)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg">
                  <Edit size={14} />
                </button>
              </div>
              <p className="text-sm font-medium text-slate-700">{j.materi}</p>
              {j.kegiatan_pembelajaran && <p className="text-xs text-slate-500 mt-1">{j.kegiatan_pembelajaran}</p>}
            </div>
          );
        })}
        {jurnals.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Belum ada jurnal dalam rentang ini.</div>}
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Jurnal">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Materi</label>
            <input value={editForm.materi} onChange={e => setEditForm({ ...editForm, materi: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kegiatan Pembelajaran</label>
            <textarea value={editForm.kegiatan_pembelajaran} onChange={e => setEditForm({ ...editForm, kegiatan_pembelajaran: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanda Tangan</label>
            <SignaturePad value={editForm.ttd_guru} onChange={ttd => setEditForm({ ...editForm, ttd_guru: ttd })} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600">Batal</button>
            <button onClick={saveEdit} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
