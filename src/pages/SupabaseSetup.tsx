// @ts-nocheck
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database, CheckCircle2, XCircle, Copy, ExternalLink,
  RefreshCw, AlertTriangle, ChevronRight, Loader2
} from 'lucide-react';
import { sbSelect } from '../lib/supabase';
import { SUPABASE_URL } from '../lib/supabase';

const SQL_SETUP = `-- Jalankan di Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Buat fungsi hash & verify password
CREATE OR REPLACE FUNCTION verify_password(input_password TEXT, stored_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION hash_password(input_password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(input_password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Buat semua tabel
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY, nama TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guru', is_walas BOOLEAN DEFAULT FALSE,
  kelas_wali_id BIGINT DEFAULT NULL, ttd TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kelas (
  id BIGSERIAL PRIMARY KEY, nama TEXT NOT NULL,
  tahun_ajaran TEXT DEFAULT '2025/2026', wali_kelas_id BIGINT DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS mapel (
  id BIGSERIAL PRIMARY KEY, nama TEXT NOT NULL,
  kode TEXT DEFAULT '', jp_per_pekan INT DEFAULT 2
);
CREATE TABLE IF NOT EXISTS mapel_kelas (
  id BIGSERIAL PRIMARY KEY, kelas_id BIGINT NOT NULL, mapel_id BIGINT NOT NULL,
  guru_id BIGINT NOT NULL, UNIQUE(kelas_id, mapel_id)
);
CREATE TABLE IF NOT EXISTS siswa (
  id BIGSERIAL PRIMARY KEY, nama TEXT NOT NULL, nisn TEXT NOT NULL UNIQUE,
  alamat TEXT DEFAULT '', nama_ayah TEXT DEFAULT '', nama_ibu TEXT DEFAULT '',
  kelas_id BIGINT DEFAULT NULL, poin INT DEFAULT 100
);
CREATE TABLE IF NOT EXISTS jadwal_pelajaran (
  id BIGSERIAL PRIMARY KEY, kelas_id BIGINT NOT NULL, mapel_id BIGINT NOT NULL,
  guru_id BIGINT NOT NULL, hari TEXT NOT NULL, jam_mulai TIME NOT NULL, jam_selesai TIME NOT NULL
);
CREATE TABLE IF NOT EXISTS presensi (
  id BIGSERIAL PRIMARY KEY, jadwal_id BIGINT NOT NULL, tanggal DATE NOT NULL,
  siswa_id BIGINT NOT NULL, status TEXT DEFAULT 'Hadir', catatan TEXT DEFAULT '',
  UNIQUE(jadwal_id, tanggal, siswa_id)
);
CREATE TABLE IF NOT EXISTS jurnal_mengajar (
  id BIGSERIAL PRIMARY KEY, jadwal_id BIGINT NOT NULL, tanggal DATE NOT NULL,
  materi TEXT DEFAULT '', kegiatan_pembelajaran TEXT DEFAULT '',
  ttd_guru TEXT DEFAULT NULL, sudah_diisi BOOLEAN DEFAULT TRUE, UNIQUE(jadwal_id, tanggal)
);
CREATE TABLE IF NOT EXISTS jenis_pelanggaran (
  id BIGSERIAL PRIMARY KEY, nama TEXT NOT NULL,
  kategori TEXT DEFAULT 'Ringan', poin_pengurangan INT DEFAULT 5
);
CREATE TABLE IF NOT EXISTS pelanggaran (
  id BIGSERIAL PRIMARY KEY, siswa_id BIGINT NOT NULL, tanggal DATE NOT NULL,
  jenis_pelanggaran_id BIGINT NOT NULL, keterangan TEXT DEFAULT '',
  poin_pengurangan INT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS nilai (
  id BIGSERIAL PRIMARY KEY, siswa_id BIGINT NOT NULL, mapel_id BIGINT NOT NULL,
  kelas_id BIGINT NOT NULL, semester TEXT DEFAULT 'Ganjil',
  nilai_asts NUMERIC(5,2) DEFAULT NULL, nilai_asas NUMERIC(5,2) DEFAULT NULL,
  UNIQUE(siswa_id, mapel_id, kelas_id, semester)
);
CREATE TABLE IF NOT EXISTS nilai_harian (
  id BIGSERIAL PRIMARY KEY, nilai_id BIGINT NOT NULL,
  nilai NUMERIC(5,2) NOT NULL, urutan INT DEFAULT 1
);
CREATE TABLE IF NOT EXISTS konfigurasi (
  id BIGSERIAL PRIMARY KEY, nama_sekolah TEXT DEFAULT 'SMP Negeri 1',
  alamat_sekolah TEXT DEFAULT 'Jl. Pendidikan No. 1',
  nama_kepsek TEXT DEFAULT 'Drs. Ahmad Fauzi, M.Pd',
  ttd_kepsek TEXT DEFAULT NULL, tahun_ajaran TEXT DEFAULT '2025/2026',
  semester TEXT DEFAULT 'Ganjil'
);

-- 4. Data awal
INSERT INTO konfigurasi (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (nama, username, password_hash, role)
VALUES ('Administrator', 'admin', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO UPDATE SET password_hash = crypt('admin123', gen_salt('bf'));
INSERT INTO jenis_pelanggaran (nama, kategori, poin_pengurangan) VALUES
('Terlambat masuk sekolah','Ringan',3),('Tidak membawa buku pelajaran','Ringan',2),
('Tidak mengerjakan PR','Ringan',5),('Berpakaian tidak rapi','Ringan',3),
('Membolos pelajaran','Sedang',10),('Berkelahi','Berat',25),
('Merokok di lingkungan sekolah','Berat',30),('Merusak fasilitas sekolah','Sedang',15),
('Tidak hormat kepada guru','Sedang',10),('Membawa HP tanpa izin','Ringan',5)
ON CONFLICT DO NOTHING;

-- 5. RLS Policies (izinkan akses dari frontend)
DO $$
DECLARE tbl TEXT;
tbls TEXT[] := ARRAY['users','kelas','mapel','mapel_kelas','siswa',
  'jadwal_pelajaran','presensi','jurnal_mengajar','jenis_pelanggaran',
  'pelanggaran','nilai','nilai_harian','konfigurasi'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', tbl);
    EXECUTE format('CREATE POLICY allow_all ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION verify_password(TEXT,TEXT) TO anon;
GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO anon;`;

const TABLES = ['users','kelas','mapel','siswa','jadwal_pelajaran','presensi','jurnal_mengajar','jenis_pelanggaran','nilai','konfigurasi'];

export default function SupabaseSetup({ onDone }: { onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<Record<string, 'ok' | 'err' | 'loading'>>({});
  const [allOk, setAllOk] = useState(false);

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkTables = async () => {
    setChecking(true);
    const res: Record<string, 'ok' | 'err' | 'loading'> = {};
    for (const t of TABLES) res[t] = 'loading';
    setResults({ ...res });

    for (const t of TABLES) {
      try {
        const rows = await sbSelect(t, 'limit=1');
        res[t] = Array.isArray(rows) ? 'ok' : 'err';
      } catch {
        res[t] = 'err';
      }
      setResults({ ...res });
      await new Promise(r => setTimeout(r, 150));
    }

    const ok = Object.values(res).every(v => v === 'ok');
    setAllOk(ok);
    setChecking(false);
  };

  useEffect(() => { checkTables(); }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <img src="https://i.imgur.com/omtDTAj.png" alt="SiKelas"
            className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/10 p-2" />
          <h1 className="text-2xl font-bold text-white">SiKelas × Supabase</h1>
          <p className="text-slate-400 text-sm mt-1">Setup database Supabase untuk memulai</p>
        </div>

        {/* Status Koneksi */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Database size={18} className="text-emerald-400" /> Status Tabel Database
            </h2>
            <button onClick={checkTables} disabled={checking}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> Cek Ulang
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TABLES.map(t => (
              <div key={t} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg">
                {results[t] === 'loading' ? (
                  <Loader2 size={14} className="text-slate-400 animate-spin" />
                ) : results[t] === 'ok' ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : results[t] === 'err' ? (
                  <XCircle size={14} className="text-red-400" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-600" />
                )}
                <span className="text-sm font-mono text-slate-300">{t}</span>
              </div>
            ))}
          </div>

          {allOk && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-4 p-3 bg-emerald-900/40 border border-emerald-700 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              Semua tabel siap! Klik tombol di bawah untuk mulai.
            </motion.div>
          )}
        </div>

        {/* Jika belum setup */}
        {!allOk && (
          <div className="bg-slate-800 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <h2 className="text-white font-semibold">Tabel belum ada — Jalankan SQL ini</h2>
            </div>
            <div className="flex gap-2 mb-3">
              <a href="https://supabase.com/dashboard/project/llisqmfgaozpjuoathxj/sql/new"
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
                <ExternalLink size={14} /> Buka SQL Editor Supabase
              </a>
              <button onClick={copySQL}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                <Copy size={14} /> {copied ? 'Tersalin!' : 'Copy SQL'}
              </button>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 max-h-48 overflow-y-auto">
              <pre className="text-emerald-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {SQL_SETUP.slice(0, 800)}...
              </pre>
            </div>
            <p className="text-slate-400 text-xs mt-3">
              1. Klik <strong className="text-white">Buka SQL Editor</strong> →
              2. Paste SQL → 3. Klik <strong className="text-white">Run</strong> →
              4. Kembali ke sini dan klik <strong className="text-white">Cek Ulang</strong>
            </p>
          </div>
        )}

        {/* Tombol Lanjut */}
        <button
          onClick={onDone}
          disabled={!allOk}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base transition-colors ${
            allOk
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          Masuk ke SiKelas <ChevronRight size={18} />
        </button>

        <p className="text-center text-slate-600 text-xs mt-4">
          Copyright © 2026 RUMAHIMI — Sistem Manajemen Kelas
        </p>
      </motion.div>
    </div>
  );
}
