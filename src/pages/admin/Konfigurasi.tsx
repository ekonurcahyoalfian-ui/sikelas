import { useState, useEffect } from 'react';
import { Save, KeyRound, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { db, User, Konfigurasi } from '../../lib/db';
import { sbRpc, sbUpdate } from '../../lib/supabase';
import SignaturePad from '../../components/SignaturePad';

interface Props {
  user: User;
  onPasswordChanged?: (u: User) => void;
}

export default function KonfigurasiPage({ user, onPasswordChanged }: Props) {
  const [form, setForm] = useState<Konfigurasi>({ nama_sekolah: '', alamat_sekolah: '', nama_kepsek: '', tahun_ajaran: '', semester: 'Ganjil' });
  const [savedSekolah, setSavedSekolah] = useState(false);
  const [loading, setLoading] = useState(true);

  const [passForm, setPassForm] = useState({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    db.getKonfigurasi().then(cfg => { setForm(cfg); setLoading(false); });
  }, []);

  const saveSekolah = async () => {
    await db.saveKonfigurasi(form);
    setSavedSekolah(true);
    setTimeout(() => setSavedSekolah(false), 2000);
  };

  const savePassword = async () => {
    setPassMsg(null);
    if (!passForm.passwordLama || !passForm.passwordBaru || !passForm.konfirmasi) {
      setPassMsg({ type: 'error', text: 'Semua kolom password harus diisi.' }); return;
    }
    if (passForm.passwordBaru.length < 6) {
      setPassMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' }); return;
    }
    if (passForm.passwordBaru !== passForm.konfirmasi) {
      setPassMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' }); return;
    }
    setPassLoading(true);
    try {
      // Verifikasi password lama
      const verified = await sbRpc<boolean>('verify_password', {
        input_password: passForm.passwordLama,
        stored_hash: (await sbRpc<string>('get_user_hash', { uid: user.id })) ?? '',
      });

      // Cara lebih simpel: coba login ulang
      const loginOk = await db.login(user.username, passForm.passwordLama);
      if (!loginOk) {
        setPassMsg({ type: 'error', text: 'Password lama tidak sesuai.' });
        setPassLoading(false); return;
      }

      // Hash password baru
      const newHash = await sbRpc<string>('hash_password', { input_password: passForm.passwordBaru });
      if (!newHash) throw new Error('Gagal hash password');

      await sbUpdate('users', `id=eq.${user.id}`, { password_hash: newHash });
      setPassMsg({ type: 'success', text: 'Password berhasil diubah!' });
      setPassForm({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
      if (onPasswordChanged) onPasswordChanged({ ...user });
    } catch (e) {
      setPassMsg({ type: 'error', text: 'Terjadi kesalahan. Coba lagi.' });
    }
    setPassLoading(false);
    setTimeout(() => setPassMsg(null), 4000);
  };

  const passwordMatch = passForm.passwordBaru && passForm.konfirmasi
    ? passForm.passwordBaru === passForm.konfirmasi : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-emerald-600" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Konfigurasi</h1>
        <p className="text-slate-500 text-sm">Pengaturan data sekolah, kepala sekolah, dan akun admin</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Data Sekolah */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block" /> Data Sekolah
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Sekolah</label>
            <input type="text" value={form.nama_sekolah} onChange={e => setForm({ ...form, nama_sekolah: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Sekolah</label>
            <textarea value={form.alamat_sekolah} onChange={e => setForm({ ...form, alamat_sekolah: e.target.value })}
              rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
              <input type="text" value={form.tahun_ajaran} onChange={e => setForm({ ...form, tahun_ajaran: e.target.value })}
                placeholder="2025/2026" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kepala Sekolah</label>
            <input type="text" value={form.nama_kepsek} onChange={e => setForm({ ...form, nama_kepsek: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <SignaturePad value={form.ttd_kepsek} onChange={ttd => setForm({ ...form, ttd_kepsek: ttd })} label="Tanda Tangan Kepala Sekolah" />
          <button onClick={saveSekolah}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors ${savedSekolah ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
            <Save size={16} /> {savedSekolah ? 'Tersimpan!' : 'Simpan Konfigurasi'}
          </button>
        </div>

        {/* Ganti Password */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            <ShieldCheck size={18} className="text-blue-500" /> Ganti Password Admin
          </h2>
          <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 flex items-center gap-2">
            <KeyRound size={15} className="text-slate-400" />
            Akun: <strong className="font-mono text-slate-800">{user.username}</strong>
          </div>

          {['passwordLama', 'passwordBaru', 'konfirmasi'].map((field, i) => {
            const labels = ['Password Lama', 'Password Baru', 'Konfirmasi Password Baru'];
            const shows = [showOld, showNew, showConfirm];
            const setShows = [setShowOld, setShowNew, setShowConfirm];
            const placeholders = ['Masukkan password saat ini', 'Minimal 6 karakter', 'Ulangi password baru'];
            const isConfirm = field === 'konfirmasi';
            const borderClass = isConfirm && passwordMatch !== null
              ? passwordMatch ? 'border-emerald-400 focus:ring-emerald-500' : 'border-red-400 focus:ring-red-500'
              : 'border-slate-200 focus:ring-blue-500';
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{labels[i]} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={shows[i] ? 'text' : 'password'}
                    value={(passForm as any)[field]}
                    onChange={e => setPassForm({ ...passForm, [field]: e.target.value })}
                    placeholder={placeholders[i]}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${borderClass}`} />
                  <button type="button" onClick={() => setShows[i](!shows[i])}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {shows[i] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {isConfirm && passwordMatch !== null && (
                  <p className={`flex items-center gap-1 text-xs mt-1 ${passwordMatch ? 'text-emerald-600' : 'text-red-600'}`}>
                    {passwordMatch ? <><CheckCircle2 size={12} /> Password cocok</> : <><XCircle size={12} /> Tidak cocok</>}
                  </p>
                )}
                {field === 'passwordBaru' && passForm.passwordBaru && passForm.passwordBaru.length < 6 && (
                  <p className="text-xs text-amber-600 mt-1">Password minimal 6 karakter</p>
                )}
              </div>
            );
          })}

          {passMsg && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${passMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {passMsg.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {passMsg.text}
            </div>
          )}

          <button onClick={savePassword} disabled={passLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors">
            {passLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Ubah Password
          </button>
        </div>
      </div>
    </div>
  );
}
