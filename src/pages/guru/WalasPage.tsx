// @ts-nocheck
import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, User, TrendingUp, TrendingDown, Award, Minus } from 'lucide-react';
import { db } from '../../lib/db';
import type { AppUser as UserType } from '../../App';
import Modal from '../../components/Modal';

export default function WalasPage({ user }: { user: UserType }) {
  const [kelas, setKelas] = useState<any>(null);
  const [siswas, setSiswas] = useState<any[]>([]);
  const [jenisPelanggaran, setJenisPelanggaran] = useState<any[]>([]);
  const [jenisPrestasi, setJenisPrestasi] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);

  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  const [detailModal, setDetailModal] = useState(false);
  const [pelanggaranModal, setPelanggaranModal] = useState(false);
  const [prestasiModal, setPrestasiModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [pelForm, setPelForm] = useState({ jenis_pelanggaran_id: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
  const [presForm, setPresForm] = useState({ jenis_prestasi_id: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });

  // Detail modal data
  const [detailPelanggaran, setDetailPelanggaran] = useState<any[]>([]);
  const [detailPrestasi, setDetailPrestasi] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const kelasId = user.kelas_wali_id;
    if (!kelasId) { setLoading(false); return; }
    const [k, sw, jp, jpr, mp] = await Promise.all([
      db.getKelasById(kelasId),
      db.getSiswa(kelasId),
      db.getJenisPelanggaran(),
      db.getJenisPrestasi(),
      db.getMapel(),
    ]);
    setKelas(k);
    setSiswas(sw);
    setJenisPelanggaran(jp);
    setJenisPrestasi(jpr);
    setMapels(mp);
    setLoading(false);
  };

  const openDetail = async (s: any) => {
    setSelectedSiswa(s);
    const [pel, pres] = await Promise.all([
      db.getPelanggaran(s.id),
      db.getPrestasi(s.id),
    ]);
    setDetailPelanggaran(pel);
    setDetailPrestasi(pres);
    setDetailModal(true);
  };

  const openPelanggaran = (s: any) => {
    setSelectedSiswa(s);
    setPelForm({ jenis_pelanggaran_id: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
    setPelanggaranModal(true);
  };

  const openPrestasi = (s: any) => {
    setSelectedSiswa(s);
    setPresForm({ jenis_prestasi_id: '', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
    setPrestasiModal(true);
  };

  const savePelanggaran = async () => {
    if (!selectedSiswa || !pelForm.jenis_pelanggaran_id) return;
    const jenis = jenisPelanggaran.find(j => j.id === Number(pelForm.jenis_pelanggaran_id));
    if (!jenis) return;
    await db.savePelanggaran({
      siswa_id: selectedSiswa.id,
      tanggal: pelForm.tanggal,
      jenis_pelanggaran_id: jenis.id,
      keterangan: pelForm.keterangan,
      poin_pengurangan: jenis.poin_pengurangan,
    });
    // Kurangi poin siswa
    const poinBaru = Math.max(0, selectedSiswa.poin - jenis.poin_pengurangan);
    await db.updatePoin(selectedSiswa.id, poinBaru);
    setPelanggaranModal(false);
    await loadData();
  };

  const savePrestasi = async () => {
    if (!selectedSiswa || !presForm.jenis_prestasi_id) return;
    const jenis = jenisPrestasi.find(j => j.id === Number(presForm.jenis_prestasi_id));
    if (!jenis) return;
    await db.savePrestasi({
      siswa_id: selectedSiswa.id,
      tanggal: presForm.tanggal,
      jenis_prestasi_id: jenis.id,
      keterangan: presForm.keterangan,
      poin_tambahan: jenis.poin_tambahan,
      dicatat_oleh: user.id,
    });
    // Tambah poin siswa (max 150)
    const poinBaru = Math.min(150, selectedSiswa.poin + jenis.poin_tambahan);
    await db.updatePoin(selectedSiswa.id, poinBaru);
    setPrestasiModal(false);
    await loadData();
  };

  const kategoriPrestasiColor = (k: string) => {
    if (k === 'Biasa')    return 'bg-blue-100 text-blue-700';
    if (k === 'Baik')     return 'bg-emerald-100 text-emerald-700';
    return 'bg-purple-100 text-purple-700';
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center py-20">
      <div className="text-slate-400">Memuat data...</div>
    </div>
  );

  if (!kelas) return (
    <div className="p-6">
      <div className="text-center py-16 text-slate-400">
        <p>Anda belum ditugaskan sebagai wali kelas.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Menu Wali Kelas</h1>
        <p className="text-slate-500 text-sm">Kelas {kelas.nama} — {siswas.length} Siswa</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Siswa', value: siswas.length, color: 'bg-blue-50 text-blue-600' },
          { label: 'Poin Baik (≥80)', value: siswas.filter(s => s.poin >= 80).length, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Perlu Perhatian', value: siswas.filter(s => s.poin >= 60 && s.poin < 80).length, color: 'bg-amber-50 text-amber-600' },
          { label: 'Kritis (<60)', value: siswas.filter(s => s.poin < 60).length, color: 'bg-red-50 text-red-600' },
        ].map(s => (
          <div key={s.label} className={`${s.color.split(' ')[0]} rounded-2xl p-4`}>
            <div className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</div>
            <div className="text-slate-600 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Siswa List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Siswa</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">NISN</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Poin</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {siswas.map(s => {
              const poinColor = s.poin >= 80 ? 'text-emerald-600 bg-emerald-50' : s.poin >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
              return (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-sm">{s.nama[0]}</div>
                      <span className="font-medium text-slate-800 text-sm">{s.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{s.nisn}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${poinColor}`}>{s.poin}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => openDetail(s)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs transition-colors">
                        <User size={12} /> Detail
                      </button>
                      <button onClick={() => openPelanggaran(s)} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs transition-colors">
                        <Minus size={12} /> Pelanggaran
                      </button>
                      <button onClick={() => openPrestasi(s)} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs transition-colors">
                        <Award size={12} /> Prestasi
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedSiswa && (
        <Modal open={detailModal} onClose={() => setDetailModal(false)} title={`Profil: ${selectedSiswa.nama}`} size="lg">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">NISN:</span> <span className="font-medium">{selectedSiswa.nisn}</span></div>
              <div><span className="text-slate-500">Poin:</span> <span className={`font-bold text-lg ${selectedSiswa.poin >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>{selectedSiswa.poin}</span></div>
              <div><span className="text-slate-500">Ayah:</span> <span className="font-medium">{selectedSiswa.nama_ayah || '-'}</span></div>
              <div><span className="text-slate-500">Ibu:</span> <span className="font-medium">{selectedSiswa.nama_ibu || '-'}</span></div>
              <div className="col-span-2"><span className="text-slate-500">Alamat:</span> <span className="font-medium">{selectedSiswa.alamat || '-'}</span></div>
            </div>

            {/* Rekap Akumulasi Poin */}
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Rekap Akumulasi Poin</h4>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Poin awal</span>
                  <span className="font-medium">100</span>
                </div>
                {detailPrestasi.map(p => {
                  const jenis = jenisPrestasi.find(j => j.id === p.jenis_prestasi_id);
                  return (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-emerald-600 flex items-center gap-1">
                        <TrendingUp size={12} /> {jenis?.nama || 'Prestasi'} <span className="text-slate-400 text-xs">({p.tanggal})</span>
                      </span>
                      <span className="text-emerald-600 font-bold">+{p.poin_tambahan}</span>
                    </div>
                  );
                })}
                {detailPelanggaran.map(p => {
                  const jenis = jenisPelanggaran.find(j => j.id === p.jenis_pelanggaran_id);
                  return (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-red-500 flex items-center gap-1">
                        <TrendingDown size={12} /> {jenis?.nama || 'Pelanggaran'} <span className="text-slate-400 text-xs">({p.tanggal})</span>
                      </span>
                      <span className="text-red-500 font-bold">-{p.poin_pengurangan}</span>
                    </div>
                  );
                })}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold">
                  <span className="text-slate-700">Total Poin</span>
                  <span className={`text-lg ${selectedSiswa.poin >= 80 ? 'text-emerald-600' : selectedSiswa.poin >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {selectedSiswa.poin}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Catat Pelanggaran */}
      <Modal open={pelanggaranModal} onClose={() => setPelanggaranModal(false)} title={`Catat Pelanggaran: ${selectedSiswa?.nama}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
            <input type="date" value={pelForm.tanggal} onChange={e => setPelForm({ ...pelForm, tanggal: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Pelanggaran</label>
            <select value={pelForm.jenis_pelanggaran_id} onChange={e => setPelForm({ ...pelForm, jenis_pelanggaran_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">-- Pilih Jenis --</option>
              {jenisPelanggaran.map(j => <option key={j.id} value={j.id}>{j.nama} (-{j.poin_pengurangan} poin)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
            <textarea value={pelForm.keterangan} onChange={e => setPelForm({ ...pelForm, keterangan: e.target.value })}
              rows={2} placeholder="Keterangan tambahan..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPelanggaranModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={savePelanggaran} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Catat</button>
          </div>
        </div>
      </Modal>

      {/* Modal Catat Prestasi */}
      <Modal open={prestasiModal} onClose={() => setPrestasiModal(false)} title={`Catat Prestasi: ${selectedSiswa?.nama}`}>
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
            <Award size={16} />
            Poin siswa akan bertambah sesuai jenis prestasi yang dipilih.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
            <input type="date" value={presForm.tanggal} onChange={e => setPresForm({ ...presForm, tanggal: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Prestasi</label>
            <select value={presForm.jenis_prestasi_id} onChange={e => setPresForm({ ...presForm, jenis_prestasi_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">-- Pilih Jenis --</option>
              {jenisPrestasi.map(j => (
                <option key={j.id} value={j.id}>{j.nama} (+{j.poin_tambahan} poin) [{j.kategori}]</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
            <textarea value={presForm.keterangan} onChange={e => setPresForm({ ...presForm, keterangan: e.target.value })}
              rows={2} placeholder="Contoh: Juara 1 lomba matematika tingkat kota" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPrestasiModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={savePrestasi} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Catat Prestasi</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
