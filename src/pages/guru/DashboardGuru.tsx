// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, FileText, Star, Calendar, ArrowRight } from 'lucide-react';
import { db } from '../../lib/db';
import type { AppUser as User } from '../../App';

const HARI_MAP: Record<number, string> = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

interface Props {
  user: User;
  onNavigate: (page: string, state?: any) => void;
}

export default function DashboardGuru({ user, onNavigate }: Props) {
  const today   = new Date();
  const hariIni = HARI_MAP[today.getDay()];
  const tanggalIni = today.toISOString().split('T')[0];

  const [jadwalsHariIni, setJadwalsHariIni] = useState<any[]>([]);
  const [allJadwals, setAllJadwals]         = useState<any[]>([]);
  const [jurnalCount, setJurnalCount]       = useState(0);
  const [kelasList, setKelasList]           = useState<any[]>([]);
  const [mapels, setMapels]                 = useState<any[]>([]);

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
      const bulanMulai = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const jurnals = await db.getJurnalByGuru(user.id, bulanMulai, tanggalIni);
      setJurnalCount(jurnals.length);
    };
    load();
  }, []);

  const hariColor: Record<string, string> = {
    Senin: 'border-blue-400', Selasa: 'border-violet-400',
    Rabu: 'border-emerald-400', Kamis: 'border-amber-400',
    Jumat: 'border-orange-400', Sabtu: 'border-pink-400',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Halo, {user.nama.split(' ')[0]}!</h1>
        <p className="text-slate-500 text-sm">Hari ini: {hariIni}, {today.toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jadwal Hari Ini',     value: jadwalsHariIni.length, icon: <Calendar size={20} />,     color: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-600'   },
          { label: 'Jurnal Bulan Ini',    value: jurnalCount,           icon: <FileText size={20} />,     color: 'bg-emerald-500',bg: 'bg-emerald-50',text: 'text-emerald-600'},
          { label: 'Total Jadwal/Minggu', value: allJadwals.length,     icon: <ClipboardList size={20} />,color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-600' },
          { label: 'Kelas Diajar',        value: new Set(allJadwals.map(j => j.kelas_id)).size, icon: <Star size={20} />, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${s.bg} rounded-2xl p-4`}>
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white mb-3`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-slate-600 text-xs mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Jadwal Hari Ini — bisa diklik */}
      {jadwalsHariIni.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Jadwal Hari Ini</h2>
            <span className="text-xs text-slate-400">Klik untuk buka presensi & jurnal</span>
          </div>
          <div className="space-y-3">
            {jadwalsHariIni.map((j, i) => {
              const mapel = mapels.find(m => m.id === j.mapel_id);
              const kelas = kelasList.find(k => k.id === j.kelas_id);

              // Cek apakah jam sekarang sedang dalam jadwal ini
              const now        = new Date();
              const [mulaiH, mulaiM] = j.jam_mulai.split(':').map(Number);
              const [selesaiH, selesaiM] = j.jam_selesai.split(':').map(Number);
              const nowMinutes    = now.getHours() * 60 + now.getMinutes();
              const mulaiMinutes  = mulaiH * 60 + mulaiM;
              const selesaiMinutes = selesaiH * 60 + selesaiM;
              const sedangBerlangsung = nowMinutes >= mulaiMinutes && nowMinutes <= selesaiMinutes;

              return (
                <motion.button
                  key={j.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onNavigate('presensi-guru', { jadwalId: j.id, tanggal: tanggalIni })}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-l-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer text-left group
                    ${sedangBerlangsung
                      ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-200'
                      : `bg-slate-50 hover:bg-white ${hariColor[hariIni] || 'border-slate-300'}`
                    }`}
                >
                  {/* Indikator berlangsung */}
                  <div className="flex-shrink-0">
                    {sedangBerlangsung
                      ? <span className="flex h-3 w-3"><span className="animate-ping absolute h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span><span className="relative h-3 w-3 rounded-full bg-emerald-500"></span></span>
                      : <div className="w-3 h-3 rounded-full bg-slate-300" />
                    }
                  </div>

                  {/* Info jadwal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{mapel?.nama || '-'}</span>
                      <span className="text-slate-400 text-sm">—</span>
                      <span className="text-slate-600 text-sm">{kelas?.nama || '-'}</span>
                      {sedangBerlangsung && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          Sedang berlangsung
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{j.jam_mulai} – {j.jam_selesai}</p>
                  </div>

                  {/* Tombol aksi */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 group-hover:text-emerald-600 transition-colors hidden sm:block">
                      Presensi & Jurnal
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 group-hover:bg-emerald-600 group-hover:border-emerald-600 flex items-center justify-center transition-all">
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {jadwalsHariIni.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Tidak ada jadwal hari ini.</p>
        </div>
      )}
    </div>
  );
}
