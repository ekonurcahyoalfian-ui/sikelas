// @ts-nocheck
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../lib/db';
import type { AppUser as User } from '../../App';
import SignaturePad from '../../components/SignaturePad';

const HARI_MAP: Record<number, string> = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
const STATUS_OPTIONS = ['Hadir', 'Izin', 'Sakit', 'Alpa'] as const;

export default function PresensiGuru({ user }: { user: User }) {
  const today = new Date();
  const [tanggal, setTanggal] = useState(today.toISOString().split('T')[0]);
  const [jadwals, setJadwals] = useState<any[]>([]);
  const [selectedJadwalId, setSelectedJadwalId] = useState('');
  const [siswas, setSiswas] = useState<any[]>([]);
  const [mapel, setMapel] = useState<any>(null);
  const [kelas, setKelas] = useState<any>(null);
  const [presensiData, setPresensiData] = useState<Record<number, { status: string; catatan: string }>>({});
  const [jurnalData, setJurnalData] = useState({ materi: '', kegiatan_pembelajaran: '', ttd_guru: '' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load jadwal saat tanggal berubah
  useEffect(() => {
    const selectedDay = new Date(tanggal + 'T12:00:00');
    const hari = HARI_MAP[selectedDay.getDay()];
    db.getJadwal({ guruId: user.id, hari }).then(j => {
      setJadwals(j);
      if (j.length > 0) setSelectedJadwalId(String(j[0].id));
      else setSelectedJadwalId('');
    });
  }, [tanggal]);

  // Load siswa & presensi saat jadwal berubah
  useEffect(() => {
    if (!selectedJadwalId) { setSiswas([]); return; }
    const jadwal = jadwals.find(j => j.id === Number(selectedJadwalId));
    if (!jadwal) return;
    const load = async () => {
      const [sw, m, k, presensi, jurnal] = await Promise.all([
        db.getSiswa(jadwal.kelas_id),
        db.getMapelById ? db.getMapel().then(list => list.find((x: any) => x.id === jadwal.mapel_id)) : Promise.resolve(null),
        db.getKelasById(jadwal.kelas_id),
        db.getPresensi(jadwal.id, tanggal),
        db.getJurnal(jadwal.id, tanggal),
      ]);
      // Get mapel
      const mapelList = await db.getMapel();
      setMapel(mapelList.find((x: any) => x.id === jadwal.mapel_id) || null);
      setKelas(k);
      setSiswas(sw);
      // Init presensi
      const pd: Record<number, { status: string; catatan: string }> = {};
      for (const s of sw) {
        const ex = presensi.find((p: any) => p.siswa_id === s.id);
        pd[s.id] = { status: ex?.status || 'Hadir', catatan: ex?.catatan || '' };
      }
      setPresensiData(pd);
      setJurnalData({ materi: jurnal?.materi || '', kegiatan_pembelajaran: jurnal?.kegiatan_pembelajaran || '', ttd_guru: jurnal?.ttd_guru || '' });
    };
    load();
  }, [selectedJadwalId, tanggal]);

  const save = async () => {
    if (!selectedJadwalId) return;
    setLoading(true);
    const jadwalId = Number(selectedJadwalId);
    // Save presensi
    for (const [siswaId, data] of Object.entries(presensiData)) {
      await db.upsertPresensi({ jadwal_id: jadwalId, tanggal, siswa_id: Number(siswaId), status: data.status as any, catatan: data.catatan });
    }
    // Save jurnal
    await db.upsertJurnal({ jadwal_id: jadwalId, tanggal, materi: jurnalData.materi, kegiatan_pembelajaran: jurnalData.kegiatan_pembelajaran, ttd_guru: jurnalData.ttd_guru, sudah_diisi: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Presensi & Jurnal</h1>
        <p className="text-slate-500 text-sm">Input presensi dan jurnal mengajar</p>
      </div>

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

      {mapel && kelas && (
        <div className="bg-blue-50 rounded-xl px-4 py-2 text-sm text-blue-700">
          <strong>{mapel.nama}</strong> — Kelas {kelas.nama}
        </div>
      )}

      {siswas.length > 0 && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Siswa</th>
                  {STATUS_OPTIONS.map(s => <th key={s} className="px-3 py-3 text-sm font-semibold text-slate-600">{s}</th>)}
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {siswas.map(s => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 text-sm font-medium text-slate-800">{s.nama}</td>
                    {STATUS_OPTIONS.map(status => (
                      <td key={status} className="px-3 py-2 text-center">
                        <input type="radio" name={`status-${s.id}`} checked={presensiData[s.id]?.status === status}
                          onChange={() => setPresensiData(prev => ({ ...prev, [s.id]: { ...prev[s.id], status } }))}
                          className="accent-emerald-500" />
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <input value={presensiData[s.id]?.catatan || ''} onChange={e => setPresensiData(prev => ({ ...prev, [s.id]: { ...prev[s.id], catatan: e.target.value } }))}
                        placeholder="Opsional" className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-800">Jurnal Mengajar</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Materi</label>
              <input value={jurnalData.materi} onChange={e => setJurnalData({ ...jurnalData, materi: e.target.value })}
                placeholder="Materi yang diajarkan" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kegiatan Pembelajaran</label>
              <textarea value={jurnalData.kegiatan_pembelajaran} onChange={e => setJurnalData({ ...jurnalData, kegiatan_pembelajaran: e.target.value })}
                rows={3} placeholder="Deskripsi kegiatan..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanda Tangan</label>
              <SignaturePad value={jurnalData.ttd_guru} onChange={ttd => setJurnalData({ ...jurnalData, ttd_guru: ttd })} />
            </div>
          </div>

          {saved && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">✅ Data berhasil disimpan!</motion.div>}

          <button onClick={save} disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3 rounded-xl font-medium">
            <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Presensi & Jurnal'}
          </button>
        </>
      )}

      {siswas.length === 0 && selectedJadwalId && (
        <div className="text-center py-10 text-slate-400 text-sm">Belum ada siswa di kelas ini.</div>
      )}
    </div>
  );
}
