// @ts-nocheck
import { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from './lib/db';
import { tableExists } from './lib/supabase';
import SupabaseSetup from './pages/SupabaseSetup';
import Sidebar from './components/Sidebar';

import AdminDashboard from './pages/admin/Dashboard';
import KelasPage from './pages/admin/Kelas';
import MapelPage from './pages/admin/Mapel';
import GuruPage from './pages/admin/Guru';
import SiswaPage from './pages/admin/Siswa';
import JadwalPage from './pages/admin/Jadwal';
import MapelKelasPage from './pages/admin/MapelKelas';
import RekapPresensiAdmin from './pages/admin/RekapPresensi';
import RekapJurnalAdmin from './pages/admin/RekapJurnal';
import RekapNilaiAdmin from './pages/admin/RekapNilai';
import PelanggaranAdmin from './pages/admin/Pelanggaran';
import KonfigurasiPage from './pages/admin/Konfigurasi';

import DashboardGuru from './pages/guru/DashboardGuru';
import PresensiGuru from './pages/guru/PresensiGuru';
import JurnalGuru from './pages/guru/JurnalGuru';
import NilaiGuru from './pages/guru/NilaiGuru';
import WalasPage from './pages/guru/WalasPage';

export interface AppUser {
  id: number;
  nama: string;
  username: string;
  role: 'admin' | 'guru';
  is_walas: boolean;
  kelas_wali_id: number | null;
  ttd?: string;
}

const SESSION_KEY = 'sikelas_session_v3';
const loadSession = (): AppUser | null => {
  try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
};
const saveSession = (u: AppUser | null) => {
  if (u) sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else sessionStorage.removeItem(SESSION_KEY);
};

export default function App() {
  const [phase, setPhase] = useState<'checking' | 'setup' | 'login' | 'app'>('checking');
  const [user, setUser] = useState<AppUser | null>(null);
  const [page, setPage] = useState('dashboard');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setUser(session);
      setPage(session.role === 'admin' ? 'dashboard' : 'dashboard-guru');
      setPhase('app');
      return;
    }
    tableExists('users').then(exists => setPhase(exists ? 'login' : 'setup'));
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const u = await db.login(username, password);
      if (u) {
        const appUser: AppUser = { id: u.id, nama: u.nama, username: u.username, role: u.role as any, is_walas: u.is_walas, kelas_wali_id: u.kelas_wali_id, ttd: u.ttd };
        saveSession(appUser);
        setUser(appUser);
        setPage(appUser.role === 'admin' ? 'dashboard' : 'dashboard-guru');
        setPhase('app');
      } else {
        setLoginError('Username atau password salah.');
      }
    } catch {
      setLoginError('Gagal terhubung ke server.');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => { saveSession(null); setUser(null); setPhase('login'); };

  if (phase === 'checking') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0f4c2a)' }}>
      <div className="text-center">
        <Loader2 size={36} className="animate-spin text-emerald-400 mx-auto mb-3" />
        <p className="text-slate-300 text-sm">Menghubungkan ke Supabase...</p>
      </div>
    </div>
  );

  if (phase === 'setup') return <SupabaseSetup onDone={() => setPhase('login')} />;

  if (phase === 'login') return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />;

  const renderPage = () => {
    if (!user) return null;
    if (user.role === 'admin') {
      switch (page) {
        case 'dashboard': return <AdminDashboard />;
        case 'kelas': return <KelasPage />;
        case 'mapel': return <MapelPage />;
        case 'guru': return <GuruPage />;
        case 'siswa': return <SiswaPage />;
        case 'jadwal': return <JadwalPage />;
        case 'mapel-kelas': return <MapelKelasPage />;
        case 'presensi-admin': return <RekapPresensiAdmin />;
        case 'jurnal-admin': return <RekapJurnalAdmin />;
        case 'nilai-admin': return <RekapNilaiAdmin />;
        case 'pelanggaran-admin': return <PelanggaranAdmin />;
        case 'konfigurasi': return <KonfigurasiPage user={user} onPasswordChanged={(u) => { saveSession(u); setUser(u); }} />;
        default: return <AdminDashboard />;
      }
    } else {
      switch (page) {
        case 'dashboard-guru': return <DashboardGuru user={user} />;
        case 'presensi-guru': return <PresensiGuru user={user} />;
        case 'jurnal-guru': return <JurnalGuru user={user} />;
        case 'nilai-guru': return <NilaiGuru user={user} />;
        case 'walas': return <WalasPage user={user} />;
        default: return <DashboardGuru user={user} />;
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user!} activePage={page} onNavigate={setPage} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 overflow-auto">{renderPage()}</main>
    </div>
  );
}

function LoginScreen({ onLogin, error, loading }: { onLogin: (u: string, p: string) => void; error: string; loading: boolean }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f4c2a 100%)' }}>
      <div className="hidden lg:flex flex-1 items-center justify-center p-12">
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="text-center max-w-md">
          <h1 className="text-5xl font-black text-white mb-3">SiKelas</h1>
          <p className="text-xl text-blue-200 mb-8">Sistem Manajemen Kelas</p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[['📚','Jadwal Pelajaran','Kelola jadwal tiap kelas'],['✅','Presensi Digital','Absensi per mata pelajaran'],['📝','Jurnal Mengajar','Dokumentasi pembelajaran'],['📊','Rekap Nilai','Analisis nilai siswa']].map(([icon,title,desc]) => (
              <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-white font-semibold text-sm">{title}</div>
                <div className="text-blue-200 text-xs mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-black text-white">SiKelas</h1>
            <p className="text-blue-200 text-sm">Sistem Manajemen Kelas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Selamat Datang</h2>
            <p className="text-slate-500 text-sm mb-6">Masuk ke akun Anda</p>
            <form onSubmit={e => { e.preventDefault(); onLogin(username, password); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Masukkan username" required autoFocus
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" required
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                {loading ? 'Memeriksa...' : 'Masuk'}
              </button>
            </form>
          </div>
          <p className="text-center text-slate-500 text-xs mt-4">Copyright © 2026 RUMAHIMI — Sistem Manajemen Kelas</p>
        </motion.div>
      </div>
    </div>
  );
}
