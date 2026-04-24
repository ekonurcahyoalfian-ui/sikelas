// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../lib/db';
import Modal from '../../components/Modal';

// ─── Download Template ─────────────────────────────────────
function downloadTemplateMapelKelas(kelasList: any[], mapels: any[], gurus: any[]) {
  const header = [['kelas', 'mata_pelajaran', 'guru']];
  const contoh = [
    ['VII A', 'Matematika',        'Dra. Siti Fatimah'],
    ['VII A', 'Bahasa Indonesia',  'Bapak Ahmad Fauzi'],
    ['VII B', 'IPA',               'Ibu Dewi Rahayu'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...header, ...contoh]);
  ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 30 }];

  // Sheet 2: daftar referensi kelas, mapel, guru
  const refHeader = [['=== DAFTAR KELAS ===', '=== MATA PELAJARAN ===', '=== GURU ===']];
  const maxLen = Math.max(kelasList.length, mapels.length, gurus.length);
  const refRows = Array.from({ length: maxLen }, (_, i) => [
    kelasList[i]?.nama || '',
    mapels[i]?.nama   || '',
    gurus[i]?.nama    || '',
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([...refHeader, ...refRows]);
  ws2['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mapel per Kelas');
  XLSX.utils.book_append_sheet(wb, ws2, 'Referensi');
  XLSX.writeFile(wb, 'template_mapel_kelas.xlsx');
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

export default function MapelKelasPage() {
  const [mapelKelas, setMapelKelas]   = useState<any[]>([]);
  const [kelasList, setKelasList]     = useState<any[]>([]);
  const [mapels, setMapels]           = useState<any[]>([]);
  const [gurus, setGurus]             = useState<any[]>([]);
  const [modal, setModal]             = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [filterKelas, setFilterKelas] = useState('');
  const [form, setForm]               = useState({ kelas_id: '', mapel_id: '', guru_id: '' });
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Import state
  const [importRows, setImportRows]       = useState<any[]>([]);
  const [importErrors, setImportErrors]   = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importDone, setImportDone]       = useState(false);
  const [importResult, setImportResult]   = useState({ success: 0, skip: 0, error: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [mk, k, m, g] = await Promise.all([
      db.getMapelKelas(), db.getKelas(), db.getMapel(), db.getGuru(),
    ]);
    setMapelKelas(mk); setKelasList(k); setMapels(m); setGurus(g);
  };

  const filtered = filterKelas
    ? mapelKelas.filter(mk => String(mk.kelas_id) === filterKelas)
    : mapelKelas;

  // ─── Tambah manual ───
  const save = async () => {
    if (!form.kelas_id || !form.mapel_id || !form.guru_id) return;
    await db.saveMapelKelas({
      kelas_id: Number(form.kelas_id),
      mapel_id: Number(form.mapel_id),
      guru_id:  Number(form.guru_id),
    });
    setModal(false); load();
  };

  const del = async (id: number) => {
    if (!confirm('Hapus mapel dari kelas ini?')) return;
    await db.deleteMapelKelas(id); load();
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
        setImportErrors(['File kosong atau format tidak sesuai.']);
        return;
      }

      const errors: string[] = [];
      const valid: any[]     = [];

      rows.forEach((row, i) => {
        const rowNum      = i + 2;
        const kelasNama   = row.kelas?.toString().trim();
        const mapelNama   = row.mata_pelajaran?.toString().trim();
        const guruNama    = row.guru?.toString().trim();

        if (!kelasNama)  { errors.push(`Baris ${rowNum}: Kolom "kelas" kosong.`); return; }
        if (!mapelNama)  { errors.push(`Baris ${rowNum}: Kolom "mata_pelajaran" kosong.`); return; }
        if (!guruNama)   { errors.push(`Baris ${rowNum}: Kolom "guru" kosong.`); return; }

        const kelas = kelasList.find(k => k.nama.toLowerCase() === kelasNama.toLowerCase());
        const mapel = mapels.find(m => m.nama.toLowerCase() === mapelNama.toLowerCase());
        const guru  = gurus.find(g => g.nama.toLowerCase() === guruNama.toLowerCase());

        valid.push({
          kelasNama, mapelNama, guruNama,
          kelasId:  kelas?.id || null,
          mapelId:  mapel?.id || null,
          guruId:   guru?.id  || null,
          valid: !!(kelas && mapel && guru),
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

      // Cek duplikat (kelas + mapel sudah ada)
      const exists = mapelKelas.find(mk =>
        mk.kelas_id === row.kelasId && mk.mapel_id === row.mapelId
      );
      if (exists) { skip++; continue; }

      try {
        await db.saveMapelKelas({
          kelas_id: row.kelasId,
          mapel_id: row.mapelId,
          guru_id:  row.guruId,
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mapel per Kelas</h1>
          <p className="text-slate-500 text-sm">Atur mata pelajaran dan guru pengampu tiap kelas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImportModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
            <Upload size={16} /> Import Excel
          </button>
          <button onClick={() => { setForm({ kelas_id: '', mapel_id: '', guru_id: '' }); setModal(true); }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      {/* Filter */}
      <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <option value="">Semua Kelas</option>
        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
      </select>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kelas</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Mata Pelajaran</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Guru Pengampu</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((mk) => {
              const kelas = kelasList.find(k => k.id === mk.kelas_id);
              const mapel = mapels.find(m => m.id === mk.mapel_id);
              const guru  = gurus.find(g => g.id === mk.guru_id);
              return (
                <tr key={mk.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{kelas?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{mapel?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{guru?.nama || '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => del(mk.id)}
                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Belum ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Modal Tambah Manual ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Tambah Mapel ke Kelas">
        <div className="space-y-4">
          {([['kelas_id','Kelas',kelasList],['mapel_id','Mata Pelajaran',mapels],['guru_id','Guru Pengampu',gurus]] as [string,string,any[]][]).map(([field, label, list]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <select value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Pilih --</option>
                {list.map((item: any) => <option key={item.id} value={item.id}>{item.nama}</option>)}
              </select>
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600">Batal</button>
            <button onClick={save} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Simpan</button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal Import Excel ─── */}
      <Modal open={importModal} onClose={closeImport} title="Import Mapel per Kelas dari Excel" size="lg">
        <div className="space-y-5">

          {/* Step 1 - Download Template */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-blue-800 text-sm">Langkah 1 — Download Template</p>
                <p className="text-blue-700 text-xs mt-0.5">
                  Template otomatis memuat daftar kelas, mapel, dan guru yang sudah ada di sistem sebagai referensi.
                </p>
              </div>
              <button onClick={() => downloadTemplateMapelKelas(kelasList, mapels, gurus)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Download size={14} /> Download Template
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['kelas',          'Nama kelas (wajib) — harus sama persis'],
                ['mata_pelajaran', 'Nama mapel (wajib) — harus sama persis'],
                ['guru',           'Nama guru (wajib) — harus sama persis'],
              ].map(([col, desc]) => (
                <div key={col} className="bg-white/60 rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-mono font-bold text-blue-700">{col}</span>
                  <span className="text-slate-600"> — {desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-2">
              💡 Lihat sheet <strong>Referensi</strong> di dalam template untuk melihat nama yang tersedia.
            </p>
          </div>

          {/* Step 2 - Upload */}
          {!importDone && (
            <div>
              <p className="font-semibold text-slate-700 text-sm mb-2">Langkah 2 — Upload File Excel</p>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <FileSpreadsheet size={26} className="text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">
                  Klik untuk pilih file <span className="font-medium text-blue-600">.xlsx</span> atau <span className="font-medium text-blue-600">.xls</span>
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
              {importErrors.slice(0, 5).map((e, i) => <p key={i} className="text-red-600 text-xs">• {e}</p>)}
              {importErrors.length > 5 && <p className="text-red-400 text-xs">...dan {importErrors.length - 5} lainnya</p>}
            </div>
          )}

          {/* Preview */}
          {importRows.length > 0 && !importDone && (
            <div>
              <p className="font-semibold text-slate-700 text-sm mb-2">Langkah 3 — Preview & Konfirmasi</p>
              <p className="text-slate-500 text-xs mb-3">
                {importRows.filter(r => r.valid).length} baris valid siap diimport.
                {importRows.filter(r => !r.valid).length > 0 && (
                  <span className="text-red-500"> {importRows.filter(r => !r.valid).length} baris tidak valid (nama tidak ditemukan) akan dilewati.</span>
                )}
              </p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-600 font-semibold">No</th>
                        <th className="text-left px-3 py-2 text-slate-600 font-semibold">Kelas</th>
                        <th className="text-left px-3 py-2 text-slate-600 font-semibold">Mata Pelajaran</th>
                        <th className="text-left px-3 py-2 text-slate-600 font-semibold">Guru</th>
                        <th className="text-left px-3 py-2 text-slate-600 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr key={i} className={`border-t border-slate-100 ${r.valid ? 'hover:bg-slate-50' : 'bg-red-50'}`}>
                          <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2">
                            <span className={r.kelasId ? 'text-slate-800 font-medium' : 'text-red-500'}>
                              {r.kelasNama || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={r.mapelId ? 'text-slate-800' : 'text-red-500'}>
                              {r.mapelNama || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={r.guruId ? 'text-slate-800' : 'text-red-500'}>
                              {r.guruNama || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {r.valid
                              ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">✓ Valid</span>
                              : <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">✗ Tidak ditemukan</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Nama kelas, mapel, dan guru harus <strong>sama persis</strong> dengan yang ada di sistem (huruf besar/kecil tidak masalah).
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
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                {importLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Mengimport...</>
                  : <><Upload size={16} /> Import {importRows.filter(r => r.valid).length} Data</>
                }
              </button>
            )}
          </div>

        </div>
      </Modal>
    </div>
  );
}
