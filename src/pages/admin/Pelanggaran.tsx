// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

export default function PelanggaranAdmin() {
  const [activeTab, setActiveTab] = useState<'jenis-pelanggaran' | 'jenis-prestasi' | 'rekap'>('jenis-pelanggaran');

  const [jenisPelList, setJenisPelList] = useState<any[]>([]);
  const [jenisPresList, setJenisPresList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [rekapData, setRekapData] = useState<any[]>([]);

  const [modal, setModal] = useState(false);
  const [modalType, setModalType] = useState<'pelanggaran' | 'prestasi'>('pelanggaran');
  const [editing, setEditing] = useState<any>(null);
  const [pelForm, setPelForm] = useState({ nama: '', kategori: 'Ringan', poin_pengurangan: 5 });
  const [presForm, setPresForm] = useState({ nama: '', kategori: 'Biasa', poin_tambahan: 5 });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [jp, jpr, sw, kl] = await Promise.all([
      db.getJenisPelanggaran(),
      db.getJenisPrestasi(),
      db.getSiswa(),
      db.getKelas(),
    ]);
    setJenisPelList(jp);
    setJenisPresList(jpr);
    setSiswaList(sw);
    setKelasList(kl);

    // Load rekap: gabung pelanggaran + prestasi per siswa
    const [allPel, allPres] = await Promise.all([
      db.getPelanggaran(),
      db.getPrestasi(),
    ]);
    const rekap = sw.map(s => ({
      siswa: s,
      pelanggaran: allPel.filter(p => p.siswa_id === s.id),
      prestasi: allPres.filter(p => p.siswa_id === s.id),
      totalKurang: allPel.filter(p => p.siswa_id === s.id).reduce((a, b) => a + b.poin_pengurangan, 0),
      totalTambah: allPres.filter(p => p.siswa_id === s.id).reduce((a, b) => a + b.poin_tambahan, 0),
    })).filter(r => r.pelanggaran.length > 0 || r.prestasi.length > 0);
    setRekapData(rekap);
  };

  // ─── Jenis Pelanggaran CRUD ───
  const openAddPel = () => { setModalType('pelanggaran'); setEditing(null); setPelForm({ nama: '', kategori: 'Ringan', poin_pengurangan: 5 }); setModal(true); };
  const openEditPel = (j: any) => { setModalType('pelanggaran'); setEditing(j); setPelForm({ nama: j.nama, kategori: j.kategori, poin_pengurangan: j.poin_pengurangan }); setModal(true); };
  const savePel = async () => {
    if (!pelForm.nama.trim()) return;
    if (editing) await db.saveJenisPelanggaran({ ...editing, ...pelForm });
    else await db.saveJenisPelanggaran(pelForm);
    setModal(false); loadAll();
  };
  const delPel = async (id: number) => {
    if (!confirm('Hapus jenis pelanggaran ini?')) return;
    await db.deleteJenisPelanggaran(id); loadAll();
  };

  // ─── Jenis Prestasi CRUD ───
  const openAddPres = () => { setModalType('prestasi'); setEditing(null); setPresForm({ nama: '', kategori: 'Biasa', poin_tambahan: 5 }); setModal(true); };
  const openEditPres = (j: any) => { setModalType('prestasi'); setEditing(j); setPresForm({ nama: j.nama, kategori: j.kategori, poin_tambahan: j.poin_tambahan }); setModal(true); };
  const savePres = async () => {
    if (!presForm.nama.trim()) return;
    if (editing) await db.saveJenisPrestasi({ ...editing, ...presForm });
    else await db.saveJenisPrestasi(presForm);
    setModal(false); loadAll();
  };
  const delPres = async (id: number) => {
    if (!confirm('Hapus jenis prestasi ini?')) return;
    await db.deleteJenisPrestasi(id); loadAll();
  };

  const kategoriPelColor = (k: string) => {
    if (k === 'Ringan') return 'bg-amber-100 text-amber-700';
    if (k === 'Sedang') return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };
  const kategoriPresColor = (k: string) => {
    if (k === 'Biasa')    return 'bg-blue-100 text-blue-700';
    if (k === 'Baik')     return 'bg-emerald-100 text-emerald-700';
    return 'bg-purple-100 text-purple-700';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pelanggaran & Prestasi</h1>
          <p className="text-slate-500 text-sm">Kelola jenis pelanggaran, jenis prestasi, dan rekap poin siswa</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'jenis-pelanggaran' && (
            <button onClick={openAddPel} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
              <Plus size={16} /> Tambah Jenis Pelanggaran
            </button>
          )}
          {activeTab === 'jenis-prestasi' && (
            <button onClick={openAddPres} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
              <Plus size={16} /> Tambah Jenis Prestasi
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'jenis-pelanggaran', label: '⚠️ Jenis Pelanggaran' },
          { id: 'jenis-prestasi',    label: '🏆 Jenis Prestasi' },
          { id: 'rekap',             label: '📊 Rekap Poin Siswa' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Jenis Pelanggaran */}
      {activeTab === 'jenis-pelanggaran' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jenisPelList.map((j, i) => (
            <motion.div key={j.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${kategoriPelColor(j.kategori)}`}>{j.kategori}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEditPel(j)} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Edit size={13} /></button>
                  <button onClick={() => delPel(j.id)} className="p-1 text-slate-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
              <h4 className="font-medium text-slate-800 text-sm mb-2">{j.nama}</h4>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-red-600 font-bold text-lg">-{j.poin_pengurangan}</span>
                <span className="text-slate-500 text-xs">poin</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tab: Jenis Prestasi */}
      {activeTab === 'jenis-prestasi' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jenisPresList.map((j, i) => (
            <motion.div key={j.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${kategoriPresColor(j.kategori)}`}>{j.kategori}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEditPres(j)} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Edit size={13} /></button>
                  <button onClick={() => delPres(j.id)} className="p-1 text-slate-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
              <h4 className="font-medium text-slate-800 text-sm mb-2">{j.nama}</h4>
              <div className="flex items-center gap-2">
                <Award size={14} className="text-emerald-500" />
                <span className="text-emerald-600 font-bold text-lg">+{j.poin_tambahan}</span>
                <span className="text-slate-500 text-xs">poin</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tab: Rekap Poin */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Siswa</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kelas</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Poin</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 text-emerald-600">+Prestasi</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 text-red-600">-Pelanggaran</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {rekapData.map((r, i) => {
                const kelasData = kelasList.find(k => k.id === r.siswa.kelas_id);
                const poinColor = r.siswa.poin >= 80 ? 'text-emerald-600' : r.siswa.poin >= 60 ? 'text-amber-600' : 'text-red-600';
                const status = r.siswa.poin >= 80 ? 'Baik' : r.siswa.poin >= 60 ? 'Perlu Perhatian' : 'Kritis';
                const statusColor = r.siswa.poin >= 80 ? 'bg-emerald-100 text-emerald-700' : r.siswa.poin >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                return (
                  <tr key={r.siswa.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-xs">{r.siswa.nama[0]}</div>
                        <span className="text-sm font-medium text-slate-800">{r.siswa.nama}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{kelasData?.nama || '-'}</td>
                    <td className="px-4 py-3"><span className={`font-bold text-lg ${poinColor}`}>{r.siswa.poin}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <TrendingUp size={13} /> +{r.totalTambah} ({r.prestasi.length}x)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <TrendingDown size={13} /> -{r.totalKurang} ({r.pelanggaran.length}x)
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>{status}</span></td>
                  </tr>
                );
              })}
              {rekapData.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Belum ada catatan pelanggaran atau prestasi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Jenis Pelanggaran */}
      {modalType === 'pelanggaran' && (
        <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Jenis Pelanggaran' : 'Tambah Jenis Pelanggaran'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pelanggaran</label>
              <input type="text" value={pelForm.nama} onChange={e => setPelForm({ ...pelForm, nama: e.target.value })}
                placeholder="Terlambat masuk sekolah" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <select value={pelForm.kategori} onChange={e => setPelForm({ ...pelForm, kategori: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="Ringan">Ringan</option>
                <option value="Sedang">Sedang</option>
                <option value="Berat">Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pengurangan Poin</label>
              <input type="number" min={1} max={100} value={pelForm.poin_pengurangan} onChange={e => setPelForm({ ...pelForm, poin_pengurangan: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={savePel} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Simpan</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Jenis Prestasi */}
      {modalType === 'prestasi' && (
        <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Jenis Prestasi' : 'Tambah Jenis Prestasi'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Prestasi</label>
              <input type="text" value={presForm.nama} onChange={e => setPresForm({ ...presForm, nama: e.target.value })}
                placeholder="Juara lomba tingkat kota" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <select value={presForm.kategori} onChange={e => setPresForm({ ...presForm, kategori: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="Biasa">Biasa</option>
                <option value="Baik">Baik</option>
                <option value="Istimewa">Istimewa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Penambahan Poin</label>
              <input type="number" min={1} max={100} value={presForm.poin_tambahan} onChange={e => setPresForm({ ...presForm, poin_tambahan: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={savePres} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
