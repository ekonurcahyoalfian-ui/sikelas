// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Clock, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// ─── Download Template ─────────────────────────────────────
function downloadTemplateJadwal(kelasList: any[], mapels: any[], gurus: any[]) {
  // Sheet 1: Template isi
  const header = [['kelas', 'mata_pelajaran', 'guru', 'hari', 'jam_mulai', 'jam_selesai']];
  const contoh = [
    ['VII A', 'Matematika',       'Dra. Siti Fatimah', 'Senin',  '07:00', '07:45'],
    ['VII A', 'Bahasa Indonesia', 'Bapak Ahmad Fauzi', 'Senin',  '07:45', '08:30'],
    ['VII B', 'IPA',              'Ibu Dewi Rahayu',   'Selasa', '08:30', '09:15'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...contoh]);
  ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];

  // Sheet 2: Referensi
  const maxLen = Math.max(kelasList.length, mapels.length, gurus.length, HARI.length);
  const refHeader = [['=== KELAS ===', '=== MATA PELAJARAN ===', '=== GURU ===', '=== HARI ===']];
  const refRows = Array.from({ length: maxLen }, (_, i) => [
    kelasList[i]?.nama || '',
    mapels[i]?.nama    || '',
    gurus[i]?.nama     || '',
    HARI[i]            || '',
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([...refHeader, ...refRows]);
  ws2['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 10 }];

  // Sheet 3: Petunjuk format waktu
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['=== PETUNJUK FORMAT WAKTU ==='],
    [''],
    ['Kolom jam_mulai dan jam_selesai menggunakan format 24 jam: HH:MM'],
    [''],
    ['Contoh:'],
    ['07:00  →  Jam 7 pagi'],
    ['07:45  →  Jam 7 lebih 45 menit'],
    ['10:30  →  Jam 10 lebih 30 menit'],
    ['13:00  →  Jam 1 siang'],
    [''],
    ['=== CONTOH JADWAL LENGKAP ==='],
    ['kelas', 'mata_pelajaran', 'guru', 'hari', 'jam_mulai', 'jam_selesai'],
    ['VII A', 'Matematika', 'Dra. Siti Fatimah', 'Senin', '07:00', '07:45'],
    ['VII A', 'Matematika', 'Dra. Siti Fatimah', 'Kamis', '09:15', '10:00'],
  ]);
  ws3['!cols'] = [{ wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws,  'Jadwal Pelajaran');
  XLSX.utils.book_append_sheet(wb, ws2, 'Referensi');
  XLSX.utils.book_append_sheet(wb, ws3, 'Petunjuk Waktu');
  XLSX.writeFile(wb, 'template_jadwal_pelajaran.xlsx');
}

// ─── Parse Excel ───────────────────────────────────────────
function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Normalisasi format waktu ──────────────────────────────
// Menangani format: "07:00", "7:00", 0.2916 (Excel serial), "07.00"
function normalizeTime(raw: any): string | null {
  if (!raw && raw !== 0) return null;

  // Jika angka desimal (Excel menyimpan waktu sebagai fraksi hari)
  if (typeof raw === 'number') {
    const totalMinutes = Math.round(raw * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  const str = raw.toString().trim().replace('.', ':');
  // Format HH:MM atau H:MM
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
  }
  return null;
}

export default function JadwalPage() {
  const [jadwals, setJadwals]         = useState<any[]>([]);
  const [kelasList, setKelasList]     = useState<any[]>([]);
  const [mapels, setMapels]           = useState<any[]>([]);
  const [gurus, setGurus]             = useState<any[]>([]);
  const [modal, setModal]             = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editing, setEditing]         = useState<any>(null);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterHari, setFilterHari]   = useState('');
  const [form, setForm]               = useState({ kelas_id: '', mapel_id: '', guru_id: '', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '07:45' });
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Import state
  const [importRows, setImportRows]       = useState<any[]>([]);
  const [importErrors, setImportErrors]   = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importDone, setImportDone]       = useState(false);
  const [importResult, setImportResult]   = useState({ success: 0, skip: 0, error: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [j, k, m, g] = await Promise.all([
      db.getJadwal(), db.getKelas(), db.getMapel(), db.getGuru(),
    ]);
    setJadwals(j); setKelasList(k); setMapels(m); setGurus(g);
  };

  const filtered = jadwals.filter(j => {
    if (filterKelas && String(j.kelas_id) !== filterKelas) return false;
    if (filterHari && j.hari !== filterHari) return false;
    return true;
  });

  // ─── Tambah / Edit manual ───
  const openAdd  = () => { setEditing(null); setForm({ kelas_id: '', mapel_id: '', guru_id: '', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '07:45' }); setModal(true); };
  const openEdit = (j: any) => { setEditing(j); setForm({ kelas_id: String(j.kelas_id), mapel_id: String(j.mapel_id), guru_id: String(j.guru_id), hari: j.hari, jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai }); setModal(true); };

  const save = async () => {
    if (!form.kelas_id || !form.mapel_id || !form.guru_id) return;
    await db.saveJadwal({ ...editing, ...form, kelas_id: Number(form.kelas_id), mapel_id: Number(form.mapel_id), guru_id: Number(form.guru_id) });
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus jadwal ini?')) return;
    await db.deleteJadwal(id); load();
  };

  // ─── Import Excel ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportDone(false);
    setImportErrors([]);
    setImportRows([]);

    try {
      const rows = await parseExcel(file);
      if (rows.length === 0) {
        setImportErrors(['File kosong atau format tidak sesuai.']); return;
      }

      const errors: string[] = [];
      const valid: any[]     = [];

      rows.forEach((row, i) => {
        const rowNum    = i + 2;
        const kelasNama = row.kelas?.toString().trim();
        const mapelNama = row.mata_pelajaran?.toString().trim();
        const guruNama  = row.guru?.toString().trim();
        const hariRaw   = row.hari?.toString().trim();
        const jamMulai  = normalizeTime(row.jam_mulai);
        const jamSelesai = normalizeTime(row.jam_selesai);

        // Validasi kolom wajib
        if (!kelasNama)   { errors.push(`Baris ${rowNum}: Kolom "kelas" kosong.`); return; }
        if (!mapelNama)   { errors.push(`Baris ${rowNum}: Kolom "mata_pelajaran" kosong.`); return; }
        if (!guruNama)    { errors.push(`Baris ${rowNum}: Kolom "guru" kosong.`); return; }
        if (!hariRaw)     { errors.push(`Baris ${rowNum}: Kolom "hari" kosong.`); return; }
        if (!jamMulai)    { errors.push(`Baris ${rowNum}: Format "jam_mulai" tidak valid. Gunakan format HH:MM, contoh: 07:00`); return; }
        if (!jamSelesai)  { errors.push(`Baris ${rowNum}: Format "jam_selesai" tidak valid. Gunakan format HH:MM, contoh: 07:45`); return; }

        // Cocokkan dengan data master
        const kelas = kelasList.find(k => k.nama.toLowerCase() === kelasNama.toLowerCase());
        const mapel = mapels.find(m => m.nama.toLowerCase() === mapelNama.toLowerCase());
        const guru  = gurus.find(g => g.nama.toLowerCase() === guruNama.toLowerCase());

        // Validasi hari
        const hariCapitalized = hariRaw.charAt(0).toUpperCase() + hariRaw.slice(1).toLowerCase();
        const hariValid = HARI.includes(hariCapitalized);

        valid.push({
          kelasNama, mapelNama, guruNama,
          hari:       hariCapitalized,
          jamMulai,   jamSelesai,
          kelasId:    kelas?.id || null,
          mapelId:    mapel?.id || null,
          guruId:     guru?.id  || null,
          hariValid,
          valid: !!(kelas && mapel && guru && hariValid && jamMulai && jamSelesai),
        });
      });

      setImportErrors(errors);
      setImportRows(valid);
    } catch {
      setImportErrors(['Gagal membaca file. Pastikan format file adalah .xlsx atau .xls.']);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const doImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    let success = 0, skip = 0, error = 0;

    for (const row of importRows) {
      if (!row.valid) { error++; continue; }

      // Cek duplikat: kelas + mapel + hari + jam sama
      const exists = jadwals.find(j =>
        j.kelas_id === row.kelasId &&
        j.mapel_id === row.mapelId &&
        j.hari     === row.hari    &&
        j.jam_mulai === row.jamMulai
      );
      if (exists) { skip++; continue; }

      try {
        await db.saveJadwal({
          kelas_id:    row.kelasId,
          mapel_id:    row.mapelId,
          guru_id:     row.guruId,
          hari:        row.hari,
          jam_mulai:   row.jamMulai,
          jam_selesai: row.jamSelesai,
        });
        success++;
      } catch { error++; }
    }

    setImportResult({ success, skip, error });
    setImportDone(true);
    setImportLoading(false);
    await load();
  };

  const closeImport = () => {
    setImportModal(false);
    setImportRows([]);
    setImportErrors([]);
    setImportDone(false);
    setImportResult({ success: 0, skip: 0, error: 0 });
  };

  const hariColor: Record<string, string> = {
    Senin: 'bg-blue-50 text-blue-700', Selasa: 'bg-violet-50 text-violet-700',
    Rabu: 'bg-emerald-50 text-emerald-700', Kamis: 'bg-amber-50 text-amber-700',
    Jumat: 'bg-orange-50 text-orange-700', Sabtu: 'bg-pink-50 text-pink-700',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jadwal Pelajaran</h1>
          <p className="text-slate-500 text-sm">Kelola jadwal pelajaran semua kelas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
            <Upload size={16} /> Import Excel
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
            <Plus size={16} /> Tambah Jadwal
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <select value={filterHari} onChange={e => setFilterHari(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Hari</option>
          {HARI.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Hari</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Waktu</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kelas</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Mapel</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Guru</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j, i) => {
              const kelas = kelasList.find(k => k.id === j.kelas_id);
              const mapel = mapels.find(m => m.id === j.mapel_id);
              const guru  = gurus.find(g => g.id === j.guru_id);
              return (
                <motion.tr key={j.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${hariColor[j.hari] || 'bg-slate-100 text-slate-600'}`}>
                      {j.hari}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" />
                      {j.jam_mulai} – {j.jam_selesai}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{kelas?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{mapel?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{guru?.nama || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(j)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={14} /></button>
                      <button onClick={() => del(j.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Belum ada jadwal.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Modal Tambah/Edit Manual ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Jadwal' : 'Tambah Jadwal'}>
        <div className="space-y-4">
          {([['kelas_id','Kelas',kelasList],['mapel_id','Mapel',mapels],['guru_id','Guru',gurus]] as [string,string,any[]][]).map(([field, label, list]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <select value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Pilih {label} --</option>
                {list.map((item: any) => <option key={item.id} value={item.id}>{item.nama}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hari</label>
            <select value={form.hari} onChange={e => setForm({ ...form, hari: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {HARI.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
              <input type="time" value={form.jam_mulai} onChange={e => setForm({ ...form, jam_mulai: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
              <input type="time" value={form.jam_selesai} onChange={e => setForm({ ...form, jam_selesai: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={save} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal Import Excel ─── */}
      <Modal open={importModal} onClose={closeImport} title="Import Jadwal Pelajaran dari Excel" size="lg">
        <div className="space-y-5">

          {/* Step 1 - Download Template */}
          <div className="bg-violet-50 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-violet-800 text-sm">Langkah 1 — Download Template</p>
                <p className="text-violet-700 text-xs mt-0.5">
                  Template berisi 3 sheet: form isian, referensi nama, dan petunjuk format waktu.
                </p>
              </div>
              <button onClick={() => downloadTemplateJadwal(kelasList, mapels, gurus)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Download size={14} /> Download Template
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                ['kelas',          'Nama kelas — harus sama persis'],
                ['mata_pelajaran', 'Nama mapel — harus sama persis'],
                ['guru',           'Nama guru — harus sama persis'],
                ['hari',           'Senin / Selasa / Rabu / Kamis / Jumat / Sabtu'],
                ['jam_mulai',      'Format HH:MM, contoh: 07:00'],
                ['jam_selesai',    'Format HH:MM, contoh: 07:45'],
              ].map(([col, desc]) => (
                <div key={col} className="bg-white/60 rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-mono font-bold text-violet-700">{col}</span>
                  <span className="text-slate-600"> — {desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-violet-600 mt-2">
              💡 Lihat sheet <strong>Referensi</strong> untuk daftar nama dan sheet <strong>Petunjuk Waktu</strong> untuk contoh format jam.
            </p>
          </div>

          {/* Step 2 - Upload */}
          {!importDone && (
            <div>
              <p className="font-semibold text-slate-700 text-sm mb-2">Langkah 2 — Upload File Excel</p>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <FileSpreadsheet size={26} className="text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">
                  Klik untuk pilih file <span className="font-medium text-violet-600">.xlsx</span> atau <span className="font-medium text-violet-600">.xls</span>
                </span>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          )}

          {/* Error validasi */}
          {importErrors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 space-y-1">
              <p className="text-red-700 font-semibold text-sm flex items-center gap-2">
                <XCircle size={16} /> {importErrors.length} baris bermasalah:
              </p>
              {importErrors.slice(0, 6).map((e, i) => <p key={i} className="text-red-600 text-xs">• {e}</p>)}
              {importErrors.length > 6 && <p className="text-red-400 text-xs">...dan {importErrors.length - 6} lainnya</p>}
            </div>
          )}

          {/* Preview */}
          {importRows.length > 0 && !importDone && (
            <div>
              <p className="font-semibold text-slate-700 text-sm mb-2">Langkah 3 — Preview & Konfirmasi</p>
              <div className="flex gap-4 text-xs mb-3">
                <span className="text-emerald-600 font-medium">✓ {importRows.filter(r => r.valid).length} valid</span>
                <span className="text-red-500 font-medium">✗ {importRows.filter(r => !r.valid).length} tidak valid</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {['No','Kelas','Mata Pelajaran','Guru','Hari','Mulai','Selesai','Status'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-slate-600 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr key={i} className={`border-t border-slate-100 ${r.valid ? 'hover:bg-slate-50' : 'bg-red-50'}`}>
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2">
                            <span className={r.kelasId ? 'text-slate-800 font-medium' : 'text-red-500'}>{r.kelasNama || '-'}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={r.mapelId ? 'text-slate-800' : 'text-red-500'}>{r.mapelNama || '-'}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={r.guruId ? 'text-slate-800' : 'text-red-500'}>{r.guruNama || '-'}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={r.hariValid ? `px-1.5 py-0.5 rounded text-xs font-medium ${hariColor[r.hari] || 'bg-slate-100 text-slate-600'}` : 'text-red-500'}>
                              {r.hari || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700">{r.jamMulai || <span className="text-red-500">?</span>}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{r.jamSelesai || <span className="text-red-500">?</span>}</td>
                          <td className="px-3 py-2">
                            {r.valid
                              ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">✓ Valid</span>
                              : <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">✗ Error</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Baris tidak valid akan dilewati. Nama harus <strong>sama persis</strong> dengan data di sistem.
              </p>
            </div>
          )}

          {/* Hasil Import */}
          {importDone && (
            <div className="bg-emerald-50 rounded-xl p-5 text-center space-y-3">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
              <p className="font-bold text-emerald-800 text-lg">Import Selesai!</p>
              <div className="flex justify-center gap-8">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{importResult.success}</div>
                  <div className="text-xs text-slate-500">Berhasil</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500">{importResult.skip}</div>
                  <div className="text-xs text-slate-500">Dilewati (duplikat)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{importResult.error}</div>
                  <div className="text-xs text-slate-500">Gagal / Tidak valid</div>
                </div>
              </div>
            </div>
          )}

          {/* Tombol */}
          <div className="flex gap-3 pt-2">
            <button onClick={closeImport} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              {importDone ? 'Tutup' : 'Batal'}
            </button>
            {importRows.filter(r => r.valid).length > 0 && !importDone && (
              <button onClick={doImport} disabled={importLoading}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                {importLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Mengimport...</>
                  : <><Upload size={16} /> Import {importRows.filter(r => r.valid).length} Jadwal</>
                }
              </button>
            )}
          </div>

        </div>
      </Modal>
    </div>
  );
}
