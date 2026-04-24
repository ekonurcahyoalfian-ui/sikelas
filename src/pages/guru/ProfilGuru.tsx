// @ts-nocheck
import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../../lib/db';
import SignaturePad from '../../components/SignaturePad';
import type { AppUser } from '../../App';

interface Props {
  user: AppUser;
  onProfileUpdated: (u: AppUser) => void;
}

export default function ProfilGuru({ user, onProfileUpdated }: Props) {
  const [ttd, setTtd]               = useState(user.ttd || '');
  const [savingTtd, setSavingTtd]   = useState(false);
  const [ttdMsg, setTtdMsg]         = useState<{type:'success'|'error', text:string} | null>(null);

  const [passForm, setPassForm]     = useState({ lama: '', baru: '', konfirmasi: '' });
  const [showLama, setShowLama]     = useState(false);
  const [showBaru, setShowBaru]     = useState(false);
  const [showKon, setShowKon]       = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg]       = useState<{type:'success'|'error', text:string} | null>(null);

  const saveTtd = async () => {
    setSavingTtd(true);
    setTtdMsg(null);
    try {
      await db.saveGuru({ id: user.id, nama: user.nama, username: user.username, ttd });
      onProfileUpdated({ ...user, ttd });
      setTtdMsg({ type: 'success', text: 'Tanda tangan berhasil disimpan!' });
    } catch {
      setTtdMsg({ type: 'error', text: 'Gagal menyimpan tanda tangan.' });
    }
    setSavingTtd(false);
    setTimeout(() => setTtdMsg(null), 3000);
  };

  const savePassword = async () => {
    setPassMsg(null);
    if (!passForm.lama || !passForm.baru || !passForm.konfirmasi) {
      setPassMsg({ type: 'error', text: 'Semua kolom wajib diisi.' }); return;
    }
    if (passForm.baru.length < 6) {
      setPassMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' }); return;
    }
    if (passForm.baru !== passForm.konfirmasi) {
      setPassMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' }); return;
    }
    setSavingPass(true);
    try {
      // Verifikasi password lama dengan login ulang
      const cek = await db.login(user.username, passForm.lama);
      if (!cek) {
        setPassMsg({ type: 'error', text: 'Password lama tidak sesuai.' });
        setSavingPass(false); return;
      }
      const ok = await db.changePassword(user.id, passForm.baru);
      if (ok) {
        setPassMsg({ type: 'success', text: 'Password berhasil diubah!' });
        setPassForm({ lama: '', baru: '', konfirmasi: '' });
      } else {
        setPassMsg({ type: 'error', text: 'Gagal mengubah password.' });
      }
    } catch {
      setPassMsg({ type: 'error', text: 'Terjadi kesalahan.' });
    }
    setSavingPass(false);
    setTimeout(() => setPassMsg(null), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profil Saya</h1>
        <p className="text-slate-500 text-sm">Kelola tanda tangan digital dan password akun</p>
      </div>

      {/* Info Akun */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-700 mb-4">Informasi Akun</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs mb-1">Nama Lengkap</p>
            <p className="font-semibold text-slate-800">{user.nama}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Username</p>
            <p className="font-mono text-slate-800">{user.username}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Role</p>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
              {user.is_walas ? 'Guru / Wali Kelas' : 'Guru'}
            </span>
          </div>
        </div>
      </div>

      {/* Tanda Tangan Digital */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-700">Tanda Tangan Digital</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Tanda tangan ini akan muncul otomatis di jurnal mengajar dan dokumen lain.
          </p>
        </div>

        <SignaturePad value={ttd} onChange={setTtd} />

        {ttdMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            ttdMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {ttdMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {ttdMsg.text}
          </div>
        )}

        <button onClick={saveTtd} disabled={savingTtd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors">
          {savingTtd ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {savingTtd ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
        </button>
      </div>

      {/* Ganti Password */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-700">Ganti Password</h2>
          <p className="text-slate-500 text-xs mt-0.5">Minimal 6 karakter.</p>
        </div>

        {[
          { key: 'lama',      label: 'Password Lama',     show: showLama, setShow: setShowLama },
          { key: 'baru',      label: 'Password Baru',     show: showBaru, setShow: setShowBaru },
          { key: 'konfirmasi',label: 'Konfirmasi Password Baru', show: showKon,  setShow: setShowKon  },
        ].map(({ key, label, show, setShow }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={passForm[key]}
                onChange={e => setPassForm({ ...passForm, [key]: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-11 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}

        {passMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            passMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {passMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {passMsg.text}
          </div>
        )}

        <button onClick={savePassword} disabled={savingPass}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors">
          {savingPass ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {savingPass ? 'Menyimpan...' : 'Ganti Password'}
        </button>
      </div>
    </div>
  );
}
