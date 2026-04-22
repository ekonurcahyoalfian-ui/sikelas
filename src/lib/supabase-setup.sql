-- ============================================================
--  SiKelas - Supabase Setup SQL  (VERSI FIXED + PRESTASI)
--  Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- FUNGSI
-- ============================================================
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

-- ============================================================
-- TABEL-TABEL
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  nama          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'guru' CHECK (role IN ('admin','guru')),
  is_walas      BOOLEAN DEFAULT FALSE,
  kelas_wali_id BIGINT DEFAULT NULL,
  ttd           TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kelas (
  id            BIGSERIAL PRIMARY KEY,
  nama          TEXT NOT NULL,
  tahun_ajaran  TEXT NOT NULL DEFAULT '2025/2026',
  wali_kelas_id BIGINT DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mapel (
  id           BIGSERIAL PRIMARY KEY,
  nama         TEXT NOT NULL,
  kode         TEXT NOT NULL DEFAULT '',
  jp_per_pekan INT  DEFAULT 2,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mapel_kelas (
  id       BIGSERIAL PRIMARY KEY,
  kelas_id BIGINT NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  mapel_id BIGINT NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
  guru_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(kelas_id, mapel_id)
);

CREATE TABLE IF NOT EXISTS siswa (
  id         BIGSERIAL PRIMARY KEY,
  nama       TEXT NOT NULL,
  nisn       TEXT NOT NULL UNIQUE,
  alamat     TEXT DEFAULT '',
  nama_ayah  TEXT DEFAULT '',
  nama_ibu   TEXT DEFAULT '',
  kelas_id   BIGINT DEFAULT NULL REFERENCES kelas(id) ON DELETE SET NULL,
  poin       INT  DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jadwal_pelajaran (
  id          BIGSERIAL PRIMARY KEY,
  kelas_id    BIGINT NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  mapel_id    BIGINT NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
  guru_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hari        TEXT NOT NULL CHECK (hari IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')),
  jam_mulai   TIME NOT NULL,
  jam_selesai TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS presensi (
  id         BIGSERIAL PRIMARY KEY,
  jadwal_id  BIGINT NOT NULL REFERENCES jadwal_pelajaran(id) ON DELETE CASCADE,
  tanggal    DATE NOT NULL,
  siswa_id   BIGINT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'Hadir' CHECK (status IN ('Hadir','Izin','Sakit','Alpa')),
  catatan    TEXT DEFAULT '',
  UNIQUE(jadwal_id, tanggal, siswa_id)
);

CREATE TABLE IF NOT EXISTS jurnal_mengajar (
  id                    BIGSERIAL PRIMARY KEY,
  jadwal_id             BIGINT NOT NULL REFERENCES jadwal_pelajaran(id) ON DELETE CASCADE,
  tanggal               DATE NOT NULL,
  materi                TEXT NOT NULL DEFAULT '',
  kegiatan_pembelajaran TEXT DEFAULT '',
  ttd_guru              TEXT DEFAULT NULL,
  sudah_diisi           BOOLEAN DEFAULT TRUE,
  UNIQUE(jadwal_id, tanggal)
);

CREATE TABLE IF NOT EXISTS jenis_pelanggaran (
  id               BIGSERIAL PRIMARY KEY,
  nama             TEXT NOT NULL,
  kategori         TEXT NOT NULL DEFAULT 'Ringan' CHECK (kategori IN ('Ringan','Sedang','Berat')),
  poin_pengurangan INT  NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS pelanggaran (
  id                   BIGSERIAL PRIMARY KEY,
  siswa_id             BIGINT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  tanggal              DATE NOT NULL,
  jenis_pelanggaran_id BIGINT NOT NULL REFERENCES jenis_pelanggaran(id) ON DELETE CASCADE,
  keterangan           TEXT DEFAULT '',
  poin_pengurangan     INT  NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL BARU: PRESTASI (penambahan poin)
-- ============================================================
CREATE TABLE IF NOT EXISTS jenis_prestasi (
  id              BIGSERIAL PRIMARY KEY,
  nama            TEXT NOT NULL,
  kategori        TEXT NOT NULL DEFAULT 'Biasa' CHECK (kategori IN ('Biasa','Baik','Istimewa')),
  poin_tambahan   INT  NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS prestasi (
  id              BIGSERIAL PRIMARY KEY,
  siswa_id        BIGINT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  tanggal         DATE NOT NULL,
  jenis_prestasi_id BIGINT NOT NULL REFERENCES jenis_prestasi(id) ON DELETE CASCADE,
  keterangan      TEXT DEFAULT '',
  poin_tambahan   INT  NOT NULL,
  dicatat_oleh    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nilai (
  id         BIGSERIAL PRIMARY KEY,
  siswa_id   BIGINT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  mapel_id   BIGINT NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
  kelas_id   BIGINT NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  semester   TEXT DEFAULT 'Ganjil',
  nilai_asts NUMERIC(5,2) DEFAULT NULL,
  nilai_asas NUMERIC(5,2) DEFAULT NULL,
  UNIQUE(siswa_id, mapel_id, kelas_id, semester)
);

CREATE TABLE IF NOT EXISTS nilai_harian (
  id       BIGSERIAL PRIMARY KEY,
  nilai_id BIGINT NOT NULL REFERENCES nilai(id) ON DELETE CASCADE,
  nilai    NUMERIC(5,2) NOT NULL,
  urutan   INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS konfigurasi (
  id              BIGSERIAL PRIMARY KEY,
  nama_sekolah    TEXT DEFAULT 'SMP Negeri 1',
  alamat_sekolah  TEXT DEFAULT 'Jl. Pendidikan No. 1',
  nama_kepsek     TEXT DEFAULT 'Drs. Ahmad Fauzi, M.Pd',
  ttd_kepsek      TEXT DEFAULT NULL,
  tahun_ajaran    TEXT DEFAULT '2025/2026',
  semester        TEXT DEFAULT 'Ganjil' CHECK (semester IN ('Ganjil','Genap'))
);

-- ============================================================
-- DATA AWAL
-- ============================================================
INSERT INTO konfigurasi (id, nama_sekolah, alamat_sekolah, nama_kepsek, tahun_ajaran, semester)
VALUES (1, 'SMP Negeri 1', 'Jl. Pendidikan No. 1', 'Drs. Ahmad Fauzi, M.Pd', '2025/2026', 'Ganjil')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (nama, username, password_hash, role)
VALUES ('Administrator', 'admin', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO UPDATE SET password_hash = crypt('admin123', gen_salt('bf'));

INSERT INTO jenis_pelanggaran (nama, kategori, poin_pengurangan) VALUES
  ('Terlambat masuk sekolah',       'Ringan', 3),
  ('Tidak membawa buku pelajaran',  'Ringan', 2),
  ('Tidak mengerjakan PR',           'Ringan', 5),
  ('Berpakaian tidak rapi',          'Ringan', 3),
  ('Membolos pelajaran',             'Sedang', 10),
  ('Berkelahi',                      'Berat',  25),
  ('Merokok di lingkungan sekolah',  'Berat',  30),
  ('Merusak fasilitas sekolah',      'Sedang', 15),
  ('Tidak hormat kepada guru',       'Sedang', 10),
  ('Membawa HP tanpa izin',          'Ringan', 5)
ON CONFLICT DO NOTHING;

INSERT INTO jenis_prestasi (nama, kategori, poin_tambahan) VALUES
  ('Aktif menjawab pertanyaan',      'Biasa',    3),
  ('Membantu teman belajar',         'Biasa',    3),
  ('Nilai ujian bagus (≥90)',        'Baik',     5),
  ('Ketua kelas berprestasi',        'Baik',     5),
  ('Juara kelas',                    'Istimewa', 10),
  ('Juara lomba tingkat sekolah',    'Istimewa', 10),
  ('Juara lomba tingkat kota',       'Istimewa', 20),
  ('Prestasi olahraga',              'Baik',     7),
  ('Membantu guru',                  'Biasa',    3),
  ('Tidak pernah absen sebulan',     'Baik',     5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapel                ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapel_kelas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa                ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_pelajaran     ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi             ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_mengajar      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_pelanggaran    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pelanggaran          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_prestasi       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestasi             ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai                ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai_harian         ENABLE ROW LEVEL SECURITY;
ALTER TABLE konfigurasi          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'users','kelas','mapel','mapel_kelas','siswa',
    'jadwal_pelajaran','presensi','jurnal_mengajar',
    'jenis_pelanggaran','pelanggaran',
    'jenis_prestasi','prestasi',
    'nilai','nilai_harian','konfigurasi'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', tbl);
    EXECUTE format('CREATE POLICY allow_all ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION hash_password(TEXT) TO anon;

-- ============================================================
-- SELESAI!
-- ============================================================
