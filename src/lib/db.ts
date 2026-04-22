// ============================================================
//  SiKelas - Database Layer (Supabase REST API)
// ============================================================

import { sbSelect, sbSelectOne, sbInsert, sbUpdate, sbDelete, sbUpsert, sbRpc } from './supabase';

export interface User {
  id: number;
  nama: string;
  username: string;
  password_hash?: string;
  role: 'admin' | 'guru';
  is_walas: boolean;
  kelas_wali_id: number | null;
  ttd?: string;
}

export interface Kelas {
  id: number;
  nama: string;
  tahun_ajaran: string;
  wali_kelas_id: number | null;
}

export interface Mapel {
  id: number;
  nama: string;
  kode: string;
  jp_per_pekan: number;
}

export interface MapelKelas {
  id: number;
  kelas_id: number;
  mapel_id: number;
  guru_id: number;
}

export interface Siswa {
  id: number;
  nama: string;
  nisn: string;
  alamat: string;
  nama_ayah: string;
  nama_ibu: string;
  kelas_id: number | null;
  poin: number;
}

export interface Jadwal {
  id: number;
  kelas_id: number;
  mapel_id: number;
  guru_id: number;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
}

export interface Presensi {
  id?: number;
  jadwal_id: number;
  tanggal: string;
  siswa_id: number;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  catatan?: string;
}

export interface Jurnal {
  id?: number;
  jadwal_id: number;
  tanggal: string;
  materi: string;
  kegiatan_pembelajaran: string;
  ttd_guru?: string;
  sudah_diisi: boolean;
}

export interface JenisPelanggaran {
  id: number;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin_pengurangan: number;
}

export interface Pelanggaran {
  id?: number;
  siswa_id: number;
  tanggal: string;
  jenis_pelanggaran_id: number;
  keterangan: string;
  poin_pengurangan: number;
}

// ── BARU: Prestasi (penambahan poin) ──
export interface JenisPrestasi {
  id: number;
  nama: string;
  kategori: 'Biasa' | 'Baik' | 'Istimewa';
  poin_tambahan: number;
}

export interface Prestasi {
  id?: number;
  siswa_id: number;
  tanggal: string;
  jenis_prestasi_id: number;
  keterangan: string;
  poin_tambahan: number;
  dicatat_oleh?: number | null;
}

export interface Nilai {
  id?: number;
  siswa_id: number;
  mapel_id: number;
  kelas_id: number;
  semester: string;
  nilai_asts: number | null;
  nilai_asas: number | null;
}

export interface NilaiHarian {
  id?: number;
  nilai_id: number;
  nilai: number;
  urutan: number;
}

export interface Konfigurasi {
  id?: number;
  nama_sekolah: string;
  alamat_sekolah: string;
  nama_kepsek: string;
  ttd_kepsek?: string;
  tahun_ajaran: string;
  semester: string;
}

// ============================================================
// DB API
// ============================================================
export const db = {

  // ---- AUTH ----
  async login(username: string, password: string): Promise<User | null> {
    const rows = await sbSelect<User & { password_hash: string }>(
      'users',
      `username=eq.${encodeURIComponent(username)}&select=*`
    );
    const user = rows[0];
    if (!user) return null;
    const ok = await sbRpc<boolean>('verify_password', {
      input_password: password,
      stored_hash: user.password_hash,
    });
    if (!ok) return null;
    const { password_hash: _, ...safe } = user;
    return safe as User;
  },

  async changePassword(userId: number, newPassword: string): Promise<boolean> {
    const result = await sbRpc<string>('hash_password', { input_password: newPassword });
    if (!result) return false;
    await sbUpdate('users', `id=eq.${userId}`, { password_hash: result });
    return true;
  },

  // ---- USERS / GURU ----
  async getGuru(): Promise<User[]> {
    return sbSelect<User>('users', `role=eq.guru&order=nama`);
  },
  async getUserById(id: number): Promise<User | null> {
    return sbSelectOne<User>('users', `id=eq.${id}&select=*`);
  },
  async saveGuru(data: Partial<User> & { password?: string }): Promise<User | null> {
    const { password, ...rest } = data;
    if (data.id) {
      const payload: any = { ...rest };
      if (password) {
        const hash = await sbRpc<string>('hash_password', { input_password: password });
        if (hash) payload.password_hash = hash;
      }
      return sbUpdate<User>('users', `id=eq.${data.id}`, payload);
    } else {
      const hash = await sbRpc<string>('hash_password', { input_password: password || 'guru123' });
      return sbInsert<User>('users', { ...rest, password_hash: hash, role: 'guru' });
    }
  },
  async deleteGuru(id: number): Promise<boolean> {
    return sbDelete('users', `id=eq.${id}`);
  },

  // ---- KELAS ----
  async getKelas(): Promise<Kelas[]> {
    return sbSelect<Kelas>('kelas', `order=nama`);
  },
  async getKelasById(id: number): Promise<Kelas | null> {
    return sbSelectOne<Kelas>('kelas', `id=eq.${id}`);
  },
  async saveKelas(data: Partial<Kelas>): Promise<Kelas | null> {
    if (data.id) return sbUpdate<Kelas>('kelas', `id=eq.${data.id}`, data);
    return sbInsert<Kelas>('kelas', data);
  },
  async deleteKelas(id: number): Promise<boolean> {
    return sbDelete('kelas', `id=eq.${id}`);
  },

  // ---- MAPEL ----
  async getMapel(): Promise<Mapel[]> {
    return sbSelect<Mapel>('mapel', `order=nama`);
  },
  async getMapelById(id: number): Promise<Mapel | null> {
    return sbSelectOne<Mapel>('mapel', `id=eq.${id}`);
  },
  async saveMapel(data: Partial<Mapel>): Promise<Mapel | null> {
    if (data.id) return sbUpdate<Mapel>('mapel', `id=eq.${data.id}`, data);
    return sbInsert<Mapel>('mapel', data);
  },
  async deleteMapel(id: number): Promise<boolean> {
    return sbDelete('mapel', `id=eq.${id}`);
  },

  // ---- MAPEL KELAS ----
  async getMapelKelas(kelasId?: number): Promise<MapelKelas[]> {
    const q = kelasId ? `kelas_id=eq.${kelasId}` : '';
    return sbSelect<MapelKelas>('mapel_kelas', q);
  },
  async saveMapelKelas(data: Partial<MapelKelas>): Promise<MapelKelas | null> {
    return sbInsert<MapelKelas>('mapel_kelas', data);
  },
  async deleteMapelKelas(id: number): Promise<boolean> {
    return sbDelete('mapel_kelas', `id=eq.${id}`);
  },

  // ---- SISWA ----
  async getSiswa(kelasId?: number): Promise<Siswa[]> {
    const q = kelasId ? `kelas_id=eq.${kelasId}&order=nama` : `order=nama`;
    return sbSelect<Siswa>('siswa', q);
  },
  async getSiswaById(id: number): Promise<Siswa | null> {
    return sbSelectOne<Siswa>('siswa', `id=eq.${id}`);
  },
  async saveSiswa(data: Partial<Siswa>): Promise<Siswa | null> {
    if (data.id) return sbUpdate<Siswa>('siswa', `id=eq.${data.id}`, data);
    return sbInsert<Siswa>('siswa', { ...data, poin: data.poin ?? 100 });
  },
  async deleteSiswa(id: number): Promise<boolean> {
    return sbDelete('siswa', `id=eq.${id}`);
  },
  async updatePoin(siswaId: number, poin: number): Promise<void> {
    await sbUpdate('siswa', `id=eq.${siswaId}`, { poin: Math.max(0, poin) });
  },

  // ---- JADWAL ----
  async getJadwal(filter?: { kelasId?: number; guruId?: number; hari?: string }): Promise<Jadwal[]> {
    const parts: string[] = ['order=hari,jam_mulai'];
    if (filter?.kelasId) parts.push(`kelas_id=eq.${filter.kelasId}`);
    if (filter?.guruId)  parts.push(`guru_id=eq.${filter.guruId}`);
    if (filter?.hari)    parts.push(`hari=eq.${filter.hari}`);
    return sbSelect<Jadwal>('jadwal_pelajaran', parts.join('&'));
  },
  async getJadwalById(id: number): Promise<Jadwal | null> {
    return sbSelectOne<Jadwal>('jadwal_pelajaran', `id=eq.${id}`);
  },
  async saveJadwal(data: Partial<Jadwal>): Promise<Jadwal | null> {
    if (data.id) return sbUpdate<Jadwal>('jadwal_pelajaran', `id=eq.${data.id}`, data);
    return sbInsert<Jadwal>('jadwal_pelajaran', data);
  },
  async deleteJadwal(id: number): Promise<boolean> {
    return sbDelete('jadwal_pelajaran', `id=eq.${id}`);
  },

  // ---- PRESENSI ----
  async getPresensi(jadwalId: number, tanggal: string): Promise<Presensi[]> {
    return sbSelect<Presensi>('presensi', `jadwal_id=eq.${jadwalId}&tanggal=eq.${tanggal}`);
  },
  async getPresensiByRange(jadwalId: number, dari: string, sampai: string): Promise<Presensi[]> {
    return sbSelect<Presensi>('presensi', `jadwal_id=eq.${jadwalId}&tanggal=gte.${dari}&tanggal=lte.${sampai}&order=tanggal`);
  },
  async upsertPresensi(data: Presensi): Promise<void> {
    await sbUpsert<Presensi>('presensi', data, 'jadwal_id,tanggal,siswa_id');
  },

  // ---- JURNAL ----
  async getJurnal(jadwalId: number, tanggal: string): Promise<Jurnal | null> {
    return sbSelectOne<Jurnal>('jurnal_mengajar', `jadwal_id=eq.${jadwalId}&tanggal=eq.${tanggal}`);
  },
  async getJurnalByGuru(guruId: number, dari: string, sampai: string): Promise<(Jurnal & { jadwal_id: number })[]> {
    const jadwals = await db.getJadwal({ guruId });
    if (!jadwals.length) return [];
    const ids = jadwals.map(j => j.id).join(',');
    return sbSelect<Jurnal & { jadwal_id: number }>(
      'jurnal_mengajar',
      `jadwal_id=in.(${ids})&tanggal=gte.${dari}&tanggal=lte.${sampai}&order=tanggal.desc`
    );
  },
  async upsertJurnal(data: Jurnal): Promise<void> {
    await sbUpsert<Jurnal>('jurnal_mengajar', data, 'jadwal_id,tanggal');
  },
  async updateJurnal(id: number, data: Partial<Jurnal>): Promise<void> {
    await sbUpdate('jurnal_mengajar', `id=eq.${id}`, data);
  },

  // ---- JENIS PELANGGARAN ----
  async getJenisPelanggaran(): Promise<JenisPelanggaran[]> {
    return sbSelect<JenisPelanggaran>('jenis_pelanggaran', `order=kategori,nama`);
  },
  async saveJenisPelanggaran(data: Partial<JenisPelanggaran>): Promise<JenisPelanggaran | null> {
    if (data.id) return sbUpdate<JenisPelanggaran>('jenis_pelanggaran', `id=eq.${data.id}`, data);
    return sbInsert<JenisPelanggaran>('jenis_pelanggaran', data);
  },
  async deleteJenisPelanggaran(id: number): Promise<boolean> {
    return sbDelete('jenis_pelanggaran', `id=eq.${id}`);
  },

  // ---- PELANGGARAN ----
  async getPelanggaran(siswaId?: number): Promise<Pelanggaran[]> {
    const q = siswaId
      ? `siswa_id=eq.${siswaId}&order=tanggal.desc`
      : `order=tanggal.desc`;
    return sbSelect<Pelanggaran>('pelanggaran', q);
  },
  async savePelanggaran(data: Partial<Pelanggaran>): Promise<Pelanggaran | null> {
    return sbInsert<Pelanggaran>('pelanggaran', data);
  },
  async deletePelanggaran(id: number): Promise<boolean> {
    return sbDelete('pelanggaran', `id=eq.${id}`);
  },

  // ---- JENIS PRESTASI ----
  async getJenisPrestasi(): Promise<JenisPrestasi[]> {
    return sbSelect<JenisPrestasi>('jenis_prestasi', `order=kategori,nama`);
  },
  async saveJenisPrestasi(data: Partial<JenisPrestasi>): Promise<JenisPrestasi | null> {
    if (data.id) return sbUpdate<JenisPrestasi>('jenis_prestasi', `id=eq.${data.id}`, data);
    return sbInsert<JenisPrestasi>('jenis_prestasi', data);
  },
  async deleteJenisPrestasi(id: number): Promise<boolean> {
    return sbDelete('jenis_prestasi', `id=eq.${id}`);
  },

  // ---- PRESTASI ----
  async getPrestasi(siswaId?: number): Promise<Prestasi[]> {
    const q = siswaId
      ? `siswa_id=eq.${siswaId}&order=tanggal.desc`
      : `order=tanggal.desc`;
    return sbSelect<Prestasi>('prestasi', q);
  },
  async savePrestasi(data: Partial<Prestasi>): Promise<Prestasi | null> {
    return sbInsert<Prestasi>('prestasi', data);
  },
  async deletePrestasi(id: number): Promise<boolean> {
    return sbDelete('prestasi', `id=eq.${id}`);
  },

  // ---- NILAI ----
  async getNilai(siswaId: number, mapelId: number): Promise<Nilai | null> {
    return sbSelectOne<Nilai>('nilai', `siswa_id=eq.${siswaId}&mapel_id=eq.${mapelId}`);
  },
  async getNilaiBySiswa(siswaId: number): Promise<Nilai[]> {
    return sbSelect<Nilai>('nilai', `siswa_id=eq.${siswaId}`);
  },
  async getNilaiByKelas(kelasId: number): Promise<Nilai[]> {
    return sbSelect<Nilai>('nilai', `kelas_id=eq.${kelasId}`);
  },
  async upsertNilai(data: Nilai): Promise<Nilai | null> {
    return sbUpsert<Nilai>('nilai', data, 'siswa_id,mapel_id,kelas_id,semester');
  },
  async getNilaiHarian(nilaiId: number): Promise<NilaiHarian[]> {
    return sbSelect<NilaiHarian>('nilai_harian', `nilai_id=eq.${nilaiId}&order=urutan`);
  },
  async deleteNilaiHarian(nilaiId: number): Promise<void> {
    await sbDelete('nilai_harian', `nilai_id=eq.${nilaiId}`);
  },
  async insertNilaiHarian(data: Omit<NilaiHarian, 'id'>): Promise<void> {
    await sbInsert('nilai_harian', data);
  },

  // ---- KONFIGURASI ----
  async getKonfigurasi(): Promise<Konfigurasi> {
    const row = await sbSelectOne<Konfigurasi>('konfigurasi', `id=eq.1`);
    return row ?? {
      nama_sekolah: 'SMP Negeri 1',
      alamat_sekolah: 'Jl. Pendidikan No. 1',
      nama_kepsek: 'Drs. Ahmad Fauzi, M.Pd',
      tahun_ajaran: '2025/2026',
      semester: 'Ganjil',
    };
  },
  async saveKonfigurasi(data: Partial<Konfigurasi>): Promise<void> {
    await sbUpsert<Konfigurasi>('konfigurasi', { ...data, id: 1 }, 'id');
  },
};
