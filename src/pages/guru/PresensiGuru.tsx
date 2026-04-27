// @ts-nocheck
import { useState, useEffect } from 'react';
import { Save, Award, Minus, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/db';
import type { AppUser as User } from '../../App';
import SignaturePad from '../../components/SignaturePad';

const HARI_MAP: Record<number, string> = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
const STATUS_OPTIONS = ['Hadir', 'Izin', 'Sakit', 'Alpa'] as const;

// ─── Mini Modal Poin ───────────────────────────────────────
function PoinModal({ siswa, type, jenisList, tanggal, guruId, onClose, onSaved }: {
  siswa: any;
  type: 'pelanggaran' | 'prestasi';
  jenisList: any[];
  tanggal: string;
  guruId: number;
  onClose: () => void;
  onSaved: (siswaId: number, deltaPoin: number) => void;
}) {
  const [jenisId, setJenisId] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [saving, setSaving] = useState(false);

  const isPelanggaran = type === 'pelanggaran';
  const selectedJenis = jenisList.find(j => j.id === Number(jenisId));
  const poinDelta = selectedJenis
    ? (isPelanggaran ? -selectedJenis.poin_pengurangan : selectedJenis.poin_tambahan)
    : null;

  const save = async () => {
    if (!jenisId) return;
    setSaving(true);
    if (isPelanggaran) {
      await db.savePelanggaran({
        siswa_id: siswa.id, tanggal,
        jenis_pelanggaran_id: Number(jenisId),
        keterangan, poin_pengurangan: selectedJenis.poin_pengurangan,
      });
      await db.updatePoin(siswa.id, Math.max(0, siswa.poin - selectedJenis.poin_pengurangan));
    } else {
      await db.savePrestasi({
        siswa_id: siswa.id, tanggal,
        jenis_prestasi_id: Number(jenisId),
        keterangan, poin_tambahan: selectedJenis.poin_tambahan,
        dicatat_oleh: guruId,
      });
      await db.updatePoin(siswa.id, Math.min(150, siswa.poin + selectedJenis.poin_tambahan));
    }
    onSaved(siswa.id, poinDelta!);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPelanggaran ? 'bg-red-100' : 'bg-emerald-100'}`}>
              {isPelanggaran ? <Minus size={16} className="text-red-600" /> : <Award size={16} className="text-emerald-600" />}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">
                {isPelanggaran ? 'Catat Pelanggaran' : 'Catat Prestasi'}
              </p>
              <p className="text-xs text-slate-500">{siswa.nama}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Poin preview */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${isPelanggaran ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <span className="text-slate-600">Poin saat ini: <strong>{siswa.poin}</strong></span>
          {poinDelta !== null && (
            <span className={`font-bold ${isPelanggaran ? 'text-red-600' : 'text-emerald-600'}`}>
              {poinDelta > 0 ? '+' : ''}{poinDelta} → <strong>{Math.min(150, Math.max(0, siswa.poin + poinDelta))}</strong>
            </span>
          )}
        </div>

        {/* Pilih jenis */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {isPelanggaran ? 'Jenis Pelanggaran' : 'Jenis Prestasi'}
          </label>
          <select value={jenisId} onChange={e => setJenisId(e.target.value)}
            className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isPelanggaran ? 'border-red-200 focus:ring-red-400' : 'border-emerald-200 focus:ring-emerald-400'}`}>
            <option value="">-- Pilih --</option>
            {jenisList.map(j => (
              <option key={j.id} value={j.id}>
                {j.nama} ({isPelanggaran ? `-${j.poin_pengurangan}` : `+${j.poin_tambahan}`} poin) [{j.kategori}]
              </option>
            ))}
          </select>
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan (opsional)</label>
          <input value={keterangan} onChange={e => setKeterangan(e.target.value)}
            placeholder={isPelanggaran ? 'Contoh: terlambat 15 menit' : 'Contoh: juara lomba MTK'}
            className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isPelanggaran ? 'border-red-200 focus:ring-red-400' : 'border-emerald-200 focus:ring-emerald-400'}`} />
        </div>

        {/* Tombol */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm">
            Batal
          </button>
          <button onClick={save} disabled={!jenisId || saving}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium text-sm disabled:opacity-50 transition-colors ${isPelanggaran ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Komponen badge poin ───────────────────────────────────
function PoinBadge({ poin }: { poin: number }) {
  const color = poin >= 80 ? 'bg-emerald-100 text-emerald-700' : poin >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{poin}</span>;
}

export default function PresensiGuru({ user }: { user: User }) {
  const today = new Date();
  const [tanggal, setTanggal]               = useState(today.toISOString().split('T')[0]);
  const [jadwals, setJadwals]               = useState<any[]>([]);
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  const [siswas, setSiswas]                 = useState<any[]>([]);
  const [poinMap, setPoinMap]               = useState<Record<number, number>>({});
  const [mapel, setMapel]                   = useState<any>(null);
  const [kelas, setKelas]                   = useState<any>(null);
  const [presensiData, setPresensiData]     = useState<Record<number, { status: string; catatan: string }>>({});
  const [jurnalData, setJurnalData]         = useState({ materi: '', kegiatan_pembelajaran: '', ttd_guru: '' });
  const [saved, setSaved]                   = useState(false);
  const [loading, setLoading]               = useState(false);

  // Poin modal
  const [poinModal, setPoinModal]           = useState<{ siswa: any; type: 'pelanggaran' | 'prestasi' } | null>(null);
  const [jenisPelanggaran, setJenisPelanggaran] = useState<any[]>([]);
  const [jenisPrestasi, setJenisPrestasi]       = useState<any[]>([]);

  // Load jenis poin sekali saja
  useEffect(() => {
    Promise.all([db.getJenisPelanggaran(), db.getJenisPrestasi()]).then(([jp, jpr]) => {
      setJenisPelanggaran(jp); setJenisPrestasi(jpr);
    });
  }, []);

  // Load jadwal saat tanggal berubah
  useEffect(() => {
    const selectedDay = new Date(tanggal + 'T12:00:00');
    const hari = HARI_MAP[selectedDay.getDay()];
    db.getJadwal({ guruId: user.id, hari }).then(j => {
      setJadwals(j);
      setSelectedJadwalId(j.length > 0 ? String(j[0].id) : '');
    });
  }, [tanggal]);

  // Load siswa & presensi saat jadwal berubah
  useEffect(() => {
    if (!selectedJadwalId) { setSiswas([]); return; }
    const jadwal = jadwals.find(j => j.id === Number(selectedJadwalId));
    if (!jadwal) return;

    const load = async () => {
      const [sw, mapelList, k, presensi, jurnal] = await Promise.all([
        db.getSiswa(jadwal.kelas_id),
        db.getMapel(),
        db.getKelasById(jadwal.kelas_id),
        db.getPresensi(jadwal.id, tanggal),
        db.getJurnal(jadwal.id, tanggal),
      ]);
      setMapel(mapelList.find((x: any) => x.id === jadwal.mapel_id) || null);
      setKelas(k);
      setSiswas(sw);

      // Init poin map dari data siswa
      const pm: Record<number, number> = {};
      sw.forEach((s: any) => { pm[s.id] = s.poin; });
      setPoinMap(pm);

      // Init presensi
      const pd: Record<number, { status: string; catatan: string }> = {};
      sw.forEach((s: any) => {
        const ex = presensi.find((p: any) => p.siswa_id === s.id);
        pd[s.id] = { status: ex?.status || 'Hadir', catatan: ex?.catatan || '' };
      });
      setPresensiData(pd);
      setJurnalData({
        materi: jurnal?.materi || '',
        kegiatan_pembelajaran: jurnal?.kegiatan_pembelajaran || '',
        ttd_guru: jurnal?.ttd_guru || '',
      });
    };
    load();
  }, [selectedJadwalId, tanggal]);

  const save = async () => {
    if (!selectedJadwalId) return;
    setLoading(true);
    const jadwalId = Number(selectedJadwalId);
    for (const [siswaId, data] of Object.entries(presensiData)) {
      await db.upsertPresensi({
        jadwal_id: jadwalId, tanggal,
        siswa_id: Number(siswaId),
        status: data.status as any,
        catatan: data.catatan,
      });
    }
    await db.upsertJurnal({
      jadwal_id: jadwalId, tanggal,
      materi: jurnalData.materi,
      kegiatan_pembelajaran: jurnalData.kegiatan_pembelajaran,
      ttd_guru: jurnalData.ttd_guru,
      sudah_diisi: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setLoading(false);
  };

  // Callback setelah poin disimpan — update poinMap lokal
  const handlePoinSaved = (siswaId: number, delta: number) => {
    setPoinMap(prev => ({
      ...prev,
      [siswaId]: Math.min(150, Math.max(0, (prev[siswaId] || 100) + delta)),
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Presensi & Jurnal</h1>
        <p className="text-slate-500 text-sm">Input presensi dan jurnal mengajar</p>
      </div>

      {/* Filter tanggal & jadwal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
          <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Jadwal</label>
          <select value={selectedJadwalId} onChange={e => setSelectedJadwalId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {jadwals.length === 0 && <option value="">Tidak ada jadwal hari ini</option>}
            {jadwals.map(j => <option key={j.id} value={j.id}>{j.jam_mulai}–{j.jam_selesai}</option>)}
          </select>
        </div>
      </div>

      {/* Info mapel & kelas */}
      {mapel && kelas && (
        <div className="bg-blue-50 rounded-xl px-4 py-2.5 text-sm text-blue-700 flex items-center gap-2">
          <span className="font-bold">{mapel.nama}</span>
          <span className="text-blue-400">—</span>
          <span>Kelas {kelas.nama}</span>
        </div>
      )}

      {/* Tabel presensi */}
      {siswas.length > 0 && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 min-w-[160px]">Siswa</th>
                  <th className="px-3 py-3 text-sm font-semibold text-slate-600 text-center">Hadir</th>
                  <th className="px-3 py-3 text-sm font-semibold text-slate-600 text-center">Izin</th>
                  <th className="px-3 py-3 text-sm font-semibold text-slate-600 text-center">Sakit</th>
                  <th className="px-3 py-3 text-sm font-semibold text-slate-600 text-center">Alpa</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Catatan</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-center">Poin</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-center">Aksi Poin</th>
                </tr>
              </thead>
              <tbody>
                {siswas.map(s => {
                  const currentPoin = poinMap[s.id] ?? s.poin;
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      {/* Nama */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-xs flex-shrink-0">
                            {s.nama[0]}
                          </div>
                          <span className="text-sm font-medium text-slate-800 leading-tight">{s.nama}</span>
                        </div>
                      </td>

                      {/* Status radio */}
                      {STATUS_OPTIONS.map(status => (
                        <td key={status} className="px-3 py-3 text-center">
                          <input
                            type="radio"
                            name={`status-${s.id}`}
                            checked={presensiData[s.id]?.status === status}
                            onChange={() => setPresensiData(prev => ({ ...prev, [s.id]: { ...prev[s.id], status } }))}
                            className="accent-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                      ))}

                      {/* Catatan */}
                      <td className="px-4 py-3">
                        <input
                          value={presensiData[s.id]?.catatan || ''}
                          onChange={e => setPresensiData(prev => ({ ...prev, [s.id]: { ...prev[s.id], catatan: e.target.value } }))}
                          placeholder="Opsional"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[100px]"
                        />
                      </td>

                      {/* Poin badge */}
                      <td className="px-4 py-3 text-center">
                        <PoinBadge poin={currentPoin} />
                      </td>

                      {/* Tombol aksi poin */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPoinModal({ siswa: { ...s, poin: currentPoin }, type: 'pelanggaran' })}
                            title="Catat Pelanggaran"
                            className="flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors">
                            <Minus size={11} /> Langgar
                          </button>
                          <button
                            onClick={() => setPoinModal({ siswa: { ...s, poin: currentPoin }, type: 'prestasi' })}
                            title="Catat Prestasi"
                            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-medium transition-colors">
                            <Award size={11} /> Prestasi
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Form Jurnal */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-800">Jurnal Mengajar</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Materi</label>
              <input value={jurnalData.materi} onChange={e => setJurnalData({ ...jurnalData, materi: e.target.value })}
                placeholder="Materi yang diajarkan"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kegiatan Pembelajaran</label>
              <textarea value={jurnalData.kegiatan_pembelajaran} onChange={e => setJurnalData({ ...jurnalData, kegiatan_pembelajaran: e.target.value })}
                rows={3} placeholder="Deskripsi kegiatan..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanda Tangan</label>
              <SignaturePad value={jurnalData.ttd_guru} onChange={ttd => setJurnalData({ ...jurnalData, ttd_guru: ttd })} />
            </div>
          </div>

          {/* Feedback & Simpan */}
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
                ✅ Data berhasil disimpan!
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={save} disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            <Save size={16} />
            {loading ? 'Menyimpan...' : 'Simpan Presensi & Jurnal'}
          </button>
        </>
      )}

      {siswas.length === 0 && selectedJadwalId && (
        <div className="text-center py-10 text-slate-400 text-sm">Belum ada siswa di kelas ini.</div>
      )}

      {/* Mini Modal Poin */}
      <AnimatePresence>
        {poinModal && (
          <PoinModal
            siswa={poinModal.siswa}
            type={poinModal.type}
            jenisList={poinModal.type === 'pelanggaran' ? jenisPelanggaran : jenisPrestasi}
            tanggal={tanggal}
            guruId={user.id}
            onClose={() => setPoinModal(null)}
            onSaved={handlePoinSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
