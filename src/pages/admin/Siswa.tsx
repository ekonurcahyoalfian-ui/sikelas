// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, ArrowRight, Search, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

// ─── Download template Excel ───────────────────────────────
function downloadTemplateSiswa() {
  const header = [['nama', 'nisn', 'alamat', 'nama_ayah', 'nama_ibu', 'kelas']];
  const contoh = [
    ['Budi Santoso',    '1234567890', 'Jl. Merdeka No. 1', 'Santoso',  'Sri Wahyuni', 'VII A'],
    ['Siti Rahayu',     '0987654321', 'Jl. Veteran No. 5', 'Rahmat',   'Dewi Sartika','VII B'],
    ['Ahmad Fauzi',     '1122334455', 'Jl. Sudirman No. 3','Fauzi',    'Aminah',      'VIII A'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...contoh]);

  // Lebar kolom
  ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];

  // Style header (bold) — basic
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'D1FAE5' } } };
  ['A1','B1','C1','D1','E1','F1'].forEach(cell => {
    if (ws[cell]) ws[cell].s = headerStyle;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.writeFile(wb, 'template_siswa.xlsx');
}

// ─── Parse file Excel ──────────────────────────────────────
function parseExcelSiswa(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function SiswaPage() {
  const [siswas, setSiswas]         = useState<any[]>([]);
  const [kelasList, setKelasList]   = useState<any[]>([]);
  const [modal, setModal]           = useState(false);
  const [pindahModal, setPindahModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  const [filterKelas, setFilterKelas] = useState('');
  const [search, setSearch]         = useState('');
  const [pindahKelasId, setPindahKelasId] = useState('');
  const [form, setForm]             = useState({ nama: '', nisn: '', alamat: '', nama_ayah: '', nama_ibu: '', kelas_id: '' });
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Import state
  const [importRows, setImportRows]       = useState<any[]>([]);
  const [importErrors, setImportErrors]   = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importDone, setImportDone]       = useState(false);
  const [importResult, setImportResult]   = useState({ success: 0, skip: 0, error: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [s, k] = await Promise.all([db.getSiswa(), db.getKelas()]);
    setSiswas(s); setKelasList(k);
  };

  const filtered = siswas.filter(s => {
    const matchKelas  = filterKelas ? String(s.kelas_id) === filterKelas : true;
    const matchSearch = search ? s.nama.toLowerCase().includes(search.toLowerCase()) || s.nisn.includes(search) : true;
    return matchKelas && matchSearch;
  });

  // ─── Tambah / Edit manual ───
  const openAdd  = () => { setEditing(null); setForm({ nama: '', nisn: '', alamat: '', nama_ayah: '', nama_ibu: '', kelas_id: '' }); setModal(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ nama: s.nama, nisn: s.nisn, alamat: s.alamat || '', nama_ayah: s.nama_ayah || '', nama_ibu: s.nama_ibu || '', kelas_id: s.kelas_id ? String(s.kelas_id) : '' }); setModal(true); };

  const save = async () => {
    if (!form.nama.trim() || !form.nisn.trim()) return;
    await db.saveSiswa({ ...editing, ...form, kelas_id: form.kelas_id ? Number(form.kelas_id) : null });
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus siswa ini?')) return;
    await db.deleteSiswa(id); load();
  };

  const pindahKelas = async () => {
    if (!selectedSiswa || !pindahKelasId) return;
    await db.saveSiswa({ ...selectedSiswa, kelas_id: Number(pindahKelasId) });
    setPindahModal(false); load();
  };

  // ─── Import Excel ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportDone(false);
    setImportErrors([]);
    setImportRows([]);
    try {
      const rows = await parseExcelSiswa(file);
      if (rows.length === 0) { setImportErrors(['File kosong atau format tidak sesuai.']); return; }

      // Validasi kolom wajib
      const errors: string[] = [];
      const valid: any[] = [];
      rows.forEach((row, i) => {
        const rowNum = i + 2; // baris ke-2 karena baris 1 header
        if (!row.nama?.toString().trim()) errors.push(`Baris ${rowNum}: Kolom "nama" kosong.`);
        else if (!row.nisn?.toString().trim()) errors.push(`Baris ${rowNum}: Kolom "nisn" kosong.`);
        else valid.push({
          nama: row.nama.toString().trim(),
          nisn: row.nisn.toString().trim(),
          alamat: row.alamat?.toString().trim() || '',
          nama_ayah: row.nama_ayah?.toString().trim() || '',
          nama_ibu: row.nama_ibu?.toString().trim() || '',
          kelas_nama: row.kelas?.toString().trim() || '',
        });
      });

      setImportErrors(errors);
      setImportRows(valid);
    } catch {
      setImportErrors(['Gagal membaca file. Pastikan format file adalah .xlsx atau .xls.']);
    }
    // Reset input agar file yang sama bisa dipilih ulang
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const doImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    let success = 0, skip = 0, error = 0;

    for (const row of importRows) {
      try {
        // Cari kelas berdasarkan nama
        const kelas = kelasList.find(k => k.nama.toLowerCase() === row.kelas_nama.toLowerCase());
        const kelasId = kelas?.id || null;

        // Cek NISN duplikat
        const existing = siswas.find(s => s.nisn === row.nisn);
        if (existing) { skip++; continue; }

        await db.saveSiswa({ nama: row.nama, nisn: row.nisn, alamat: row.alamat, nama_ayah: row.nama_ayah, nama_ibu: row.nama_ibu, kelas_id: kelasId, poin: 100 });
        success++;
      } catch {
        error++;
      }
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Siswa</h1>
          <p className="text-slate-500 text-sm">{filtered.length} siswa ditemukan</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
            <Upload size={16} /> Import Excel
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
            <Plus size={16} /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / NISN..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Nama</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">NISN</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kelas</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Poin</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const kelas      = kelasList.find(k => k.id === s.kelas_id);
              const poinColor  = s.poin >= 80 ? 'text-emerald-600' : s.poin >= 60 ? 'text-amber-600' : 'text-red-600';
              return (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-sm">{s.nama[0]}</div>
                      <span className="font-medium text-slate-800 text-sm">{s.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">{s.nisn}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{kelas?.nama || <span className="text-slate-300">-</span>}</td>
                  <td className="px-4 py-3"><span className={`font-bold text-sm ${poinColor}`}>{s.poin}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => { setSelectedSiswa(s); setPindahKelasId(s.kelas_id ? String(s.kelas_id) : ''); setPindahModal(true); }}
                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg" title="Pindah Kelas"><ArrowRight size={14} /></button>
                      <button onClick={() => del(s.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg" title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">Belum ada data siswa.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Modal Tambah/Edit ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Siswa' : 'Tambah Siswa'}>
        <div className="space-y-3">
          {([['nama','Nama Lengkap','Nama siswa'],['nisn','NISN','0012345678'],['alamat','Alamat','Jl. ...'],['nama_ayah','Nama Ayah',''],['nama_ibu','Nama Ibu','']] as [string,string,string][]).map(([field, label, ph]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={ph}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kelas</label>
            <select value={form.kelas_id} onChange={e => setForm({ ...form, kelas_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
            <button onClick={save} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal Pindah Kelas ─── */}
      <Modal open={pindahModal} onClose={() => setPindahModal(false)} title={`Pindah Kelas: ${selectedSiswa?.nama}`}>
        <div className="space-y-4">
          <select value={pindahKelasId} onChange={e => setPindahKelasId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">-- Pilih Kelas Tujuan --</option>
            {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={() => setPindahModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600">Batal</button>
            <button onClick={pindahKelas} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">Pindahkan</button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal Import Excel ─── */}
      <Modal open={importModal} onClose={closeImport} title="Import Data Siswa dari Excel" size="lg">
        <div className="space-y-5">

          {/* Langkah 1 — Download Template */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Langkah 1 — Download Template</p>
                <p className="text-emerald-700 text-xs mt-0.5">Isi data siswa sesuai format template, lalu upload di bawah.</p>
              </div>
              <button onClick={downloadTemplateSiswa}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Download size={14} /> Download Template
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[['nama','Nama siswa (wajib)'],['nisn','NISN (wajib, unik)'],['alamat','Alamat'],['nama_ayah','Nama Ayah'],['nama_ibu','Nama Ibu'],['kelas','Nama kelas (contoh: VII A)']].map(([col, desc]) => (
                <div key={col} className="bg-white/60 rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-mono font-bold text-emerald-700">{col}</span>
                  <span className="text-slate-600"> — {desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Langkah 2 — Upload File */}
          {!importDone && (
            <div>
              <p className="font-semibold text-slate-700 text-sm mb-2">Langkah 2 — Upload File Excel</p>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <FileSpreadsheet size={28} className="text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">Klik untuk pilih file <span className="font-medium text-blue-600">.xlsx</span> atau <span className="font-medium text-blue-600">.xls</span></span>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          )}

          {/* Error validasi */}
          {importErrors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 space-y-1">
              <p className="text-red-700 font-semibold text-sm flex items-center gap-2"><XCircle size={16} /> {importErrors.length} baris bermasalah:</p>
              {importErrors.slice(0, 5).map((e, i) => <p key={i} className="text-red-600 text-xs">• {e}</p>)}
              {importErrors.length > 5 && <p className="text-red-400 text-xs">...dan {importErrors.length - 5} lainnya</p>}
            </div>
          )}

          {/* Preview data valid */}
          {importRows.length > 0 && !importDone && (
            <div>
              <p className="font-semibold text-slate-700 text-sm mb-2">Langkah 3 — Preview & Konfirmasi</p>
              <p className="text-slate-500 text-xs mb-3">{importRows.length} siswa siap diimport. NISN yang sudah ada akan dilewati (skip).</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {['No','Nama','NISN','Alamat','Ayah','Ibu','Kelas'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-slate-600 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{r.nama}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{r.nisn}</td>
                          <td className="px-3 py-2 text-slate-500">{r.alamat || '-'}</td>
                          <td className="px-3 py-2 text-slate-500">{r.nama_ayah || '-'}</td>
                          <td className="px-3 py-2 text-slate-500">{r.nama_ibu || '-'}</td>
                          <td className="px-3 py-2">
                            {r.kelas_nama
                              ? kelasList.find(k => k.nama.toLowerCase() === r.kelas_nama.toLowerCase())
                                ? <span className="text-emerald-600">{r.kelas_nama}</span>
                                : <span className="text-amber-600">{r.kelas_nama} ⚠️</span>
                              : <span className="text-slate-300">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {importRows.some(r => r.kelas_nama && !kelasList.find(k => k.nama.toLowerCase() === r.kelas_nama.toLowerCase())) && (
                <p className="text-amber-600 text-xs mt-2">⚠️ Kelas dengan tanda peringatan tidak ditemukan di sistem — siswa tetap diimport tanpa kelas.</p>
              )}
            </div>
          )}

          {/* Hasil import */}
          {importDone && (
            <div className="bg-emerald-50 rounded-xl p-5 text-center space-y-3">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
              <p className="font-bold text-emerald-800 text-lg">Import Selesai!</p>
              <div className="flex justify-center gap-6">
                <div><div className="text-2xl font-bold text-emerald-600">{importResult.success}</div><div className="text-xs text-slate-500">Berhasil</div></div>
                <div><div className="text-2xl font-bold text-amber-500">{importResult.skip}</div><div className="text-xs text-slate-500">Dilewati (duplikat)</div></div>
                <div><div className="text-2xl font-bold text-red-500">{importResult.error}</div><div className="text-xs text-slate-500">Error</div></div>
              </div>
            </div>
          )}

          {/* Tombol aksi */}
          <div className="flex gap-3 pt-2">
            <button onClick={closeImport} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              {importDone ? 'Tutup' : 'Batal'}
            </button>
            {importRows.length > 0 && !importDone && (
              <button onClick={doImport} disabled={importLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                {importLoading ? <><Loader2 size={16} className="animate-spin" /> Mengimport...</> : <><Upload size={16} /> Import {importRows.length} Siswa</>}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
