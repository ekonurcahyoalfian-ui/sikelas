// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, FileText, Star, Calendar } from 'lucide-react';
import { db } from '../../lib/db';
import type { AppUser as User } from '../../App';

const HARI_MAP: Record<number, string> = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

export default function DashboardGuru({ user }: { user: User }) {
  const today = new Date();
  const hariIni = HARI_MAP[today.getDay()];
  const tanggalIni = today.toISOString().split('T')[0];

  const [jadwalsHariIni, setJadwalsHariIni] = useState<any[]>([]);
  const [allJadwals, setAllJadwals] = useState<any[]>([]);
  const [jurnalCount, setJurnalCount] = useState(0);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapels, setMapels] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [jadwalHari, jadwalAll, k, m] = await Promise.all([
        db.getJadwal({ guruId: user.id, hari: hariIni }),
        db.getJadwal({ guruId: user.id }),
        db.getKelas(),
        db.getMapel(),
      ]);
      setJadwalsHariIni(jadwalHari);
      setAllJadwals(jadwalAll);
      setKelasList(k);
      setMapels(m);
      // Hitung jurnal bulan ini
      const bulanMulai = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const jurnals = await db.getJurnalByGuru(user.id, bulanMulai, tanggalIni);
      setJurnalCount(jurnals.length);
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Halo, {user.nama.split(' ')[0]}!</h1>
        <p className="text-slate-500 text-sm">Hari ini: {hariIni}, {today.toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jadwal Hari Ini', value: jadwalsHariIni.length, icon: <Calendar size={20} />, color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Jurnal Bulan Ini', value: jurnalCount, icon: <FileText size={20} />, color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Total Jadwal/Minggu', value: allJadwals.length, icon: <ClipboardList size={20} />, color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
          { label: 'Kelas Diajar', value: new Set(allJadwals.map(j => j.kelas_id)).size, icon: <Star size={20} />, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${s.bg} rounded-2xl p-4`}>
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-slate-600 text-xs mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {jadwalsHariIni.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Jadwal Hari Ini</h2>
          <div className="space-y-2">
            {jadwalsHariIni.map(j => {
              const mapel = mapels.find(m => m.id === j.mapel_id);
              const kelas = kelasList.find(k => k.id === j.kelas_id);
              return (
                <div key={j.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <div>
                    <span className="font-medium text-slate-800 text-sm">{mapel?.nama}</span>
                    <span className="text-slate-500 text-sm"> — {kelas?.nama}</span>
                  </div>
                  <span className="ml-auto text-xs text-slate-400">{j.jam_mulai}–{j.jam_selesai}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
