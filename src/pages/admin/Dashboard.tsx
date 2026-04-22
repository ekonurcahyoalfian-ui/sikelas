// @ts-nocheck
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, GraduationCap, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { db, Kelas, User, Siswa } from '../../lib/db';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ kelas: 0, guru: 0, siswa: 0, mapel: 0, jadwal: 0, pelanggaran: 0 });
  const [kelasList, setKelasList] = useState<(Kelas & { walas_nama?: string; jml_siswa: number })[]>([]);
  const [recentPelanggaran, setRecentPelanggaran] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      const [kelas, guru, siswa, mapel, jadwal, pelanggaran, cfg, jenis] = await Promise.all([
        db.getKelas(),
        db.getGuru(),
        db.getSiswa(),
        db.getMapel(),
        db.getJadwal(),
        db.getPelanggaran(),
        db.getKonfigurasi(),
        db.getJenisPelanggaran(),
      ]);
      setConfig(cfg);
      setStats({ kelas: kelas.length, guru: guru.length, siswa: siswa.length, mapel: mapel.length, jadwal: jadwal.length, pelanggaran: pelanggaran.length });

      const kelasWithInfo = kelas.map(k => ({
        ...k,
        walas_nama: guru.find(g => g.id === k.wali_kelas_id)?.nama,
        jml_siswa: siswa.filter(s => s.kelas_id === k.id).length,
      }));
      setKelasList(kelasWithInfo);

      const recent = pelanggaran.slice(0, 5).map(p => ({
        ...p,
        siswa_nama: siswa.find(s => s.id === p.siswa_id)?.nama ?? '-',
        jenis_nama: jenis.find(j => j.id === p.jenis_pelanggaran_id)?.nama ?? '-',
      }));
      setRecentPelanggaran(recent);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-emerald-600" />
    </div>
  );

  const statCards = [
    { label: 'Total Kelas', value: stats.kelas, icon: <BookOpen size={22} />, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Total Guru', value: stats.guru, icon: <Users size={22} />, color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Total Siswa', value: stats.siswa, icon: <GraduationCap size={22} />, color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Mata Pelajaran', value: stats.mapel, icon: <BookOpen size={22} />, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Total Jadwal', value: stats.jadwal, icon: <Calendar size={22} />, color: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-600' },
    { label: 'Pelanggaran', value: stats.pelanggaran, icon: <AlertTriangle size={22} />, color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Admin</h1>
        <p className="text-slate-500 text-sm mt-1">{config.nama_sekolah} — TA {config.tahun_ajaran} Semester {config.semester}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${s.bg} rounded-2xl p-4`}>
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-slate-600 text-xs mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Ringkasan Kelas</h3>
          {kelasList.length === 0 ? <p className="text-slate-400 text-sm">Belum ada kelas.</p> : (
            <div className="space-y-3">
              {kelasList.map(k => (
                <div key={k.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-800">{k.nama}</div>
                    <div className="text-xs text-slate-500">Walas: {k.walas_nama || <span className="text-amber-500">Belum ditentukan</span>}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-700">{k.jml_siswa}</div>
                    <div className="text-xs text-slate-500">Siswa</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Pelanggaran Terbaru</h3>
          {recentPelanggaran.length === 0 ? <p className="text-slate-400 text-sm">Belum ada catatan pelanggaran.</p> : (
            <div className="space-y-3">
              {recentPelanggaran.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-sm font-bold">
                    {p.siswa_nama?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm truncate">{p.siswa_nama}</div>
                    <div className="text-xs text-slate-500 truncate">{p.jenis_nama}</div>
                  </div>
                  <div className="text-red-600 font-bold text-sm">-{p.poin_pengurangan}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
