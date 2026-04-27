// @ts-nocheck
import { useState, useEffect } from 'react';
import { Edit, Download } from 'lucide-react';
import { db } from '../../lib/db';
import type { AppUser as User } from '../../App';
import Modal from '../../components/Modal';
import SignaturePad from '../../components/SignaturePad';

function generatePDFJurnal(jurnals: any[], jadwals: any[], kelasList: any[], mapels: any[], guru: User, konfigurasi: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const tanggalCetak = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });

  const rows = jurnals.map((j, idx) => {
    const jadwal  = jadwals.find(jd => jd.id === j.jadwal_id);
    const mapel   = mapels.find(m => m.id === jadwal?.mapel_id);
    const kelas   = kelasList.find(k => k.id === jadwal?.kelas_id);
    const ttd     = j.ttd_guru
      ? `<img src="${j.ttd_guru}" style="height:40px;display:block;margin:0 auto"/>`
      : '-';
    return `
      <tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#fff'}">
        <td style="text-align:center">${idx + 1}</td>
        <td style="white-space:nowrap">${j.tanggal}</td>
        <td>${mapel?.nama || '-'}</td>
        <td>${kelas?.nama || '-'}</td>
        <td>${jadwal?.hari || '-'}</td>
        <td style="white-space:nowrap">${jadwal?.jam_mulai || ''} – ${jadwal?.jam_selesai || ''}</td>
        <td>${j.materi || '-'}</td>
        <td style="font-size:10px;color:#475569">${j.kegiatan_pembelajaran || '-'}</td>
        <td style="text-align:center">${ttd}</td>
      </tr>
    `;
  }).join('');

  const guruTtd = guru.ttd
    ? `<img src="${guru.ttd}" style="height:60px;display:block;margin:0 auto"/>`
    : '<div style="height:60px"></div>';

  printWindow.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Jurnal Mengajar — ${guru.nama}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; font-size:12px; color:#1e293b; padding:20px; }
      td, th { padding:5px 8px; border-color:#cbd5e1; }
      @media print { body { padding:0; } @page { size: A4 landscape; margin: 1cm; } }
    </style>
    </head><body>

    <!-- KOP SURAT -->
    <div style="text-align:center;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:700;text-transform:uppercase">${konfigurasi.nama_sekolah || 'SMP Negeri 1'}</div>
      <div style="font-size:12px">${konfigurasi.alamat_sekolah || ''}</div>
    </div>

    <!-- JUDUL -->
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:14px;font-weight:700;text-decoration:underline">JURNAL MENGAJAR</div>
      <div style="font-size:11px;color:#475569">Tahun Ajaran ${konfigurasi.tahun_ajaran || ''} — Semester ${konfigurasi.semester || ''}</div>
      <div style="font-size:11px;color:#475569;margin-top:2px">Dicetak: ${tanggalCetak}</div>
    </div>

    <!-- INFO GURU -->
    <table style="width:100%;margin-bottom:14px;font-size:12px">
      <tr>
        <td style="width:50%"><b>Nama Guru</b> &nbsp;: ${guru.nama}</td>
        <td style="width:50%"><b>Jumlah Pertemuan</b> : ${jurnals.length}</td>
      </tr>
    </table>

    <!-- TABEL JURNAL -->
    <table border="1" style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:28px">
      <thead style="background:#f1f5f9">
        <tr>
          <th style="text-align:center;width:28px">No</th>
          <th>Tanggal</th>
          <th>Mata Pelajaran</th>
          <th>Kelas</th>
          <th>Hari</th>
          <th>Jam</th>
          <th>Materi</th>
          <th>Kegiatan Pembelajaran</th>
          <th style="text-align:center;width:70px">TTD</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <!-- TTD -->
    <table style="width:60%;margin-left:auto;text-align:center;font-size:12px">
      <tr>
        <td style="width:50%">
          Mengetahui,<br>Kepala Sekolah<br><br>
          ${konfigurasi.ttd_kepsek
            ? `<img src="${konfigurasi.ttd_kepsek}" style="height:60px"/>`
            : '<div style="height:60px"></div>'
          }
          <br><u>${konfigurasi.nama_kepsek || '........................'}</u>
        </td>
        <td style="width:50%">
          Guru Mata Pelajaran<br><br>
          ${guruTtd}
          <br><u>${guru.nama}</u>
        </td>
      </tr>
    </table>

    <script>window.onload = () => { window.print(); }</script>
    </body></html>
  `);
  printWindow.document.close();
}

export default function JurnalGuru({ user }: { user: User }) {
  const [jurnals, setJurnals]       = useState<any[]>([]);
  const [jadwals, setJadwals]       = useState<any[]>([]);
  const [kelasList, setKelasList]   = useState<any[]>([]);
  const [mapels, setMapels]         = useState<any[]>([]);
  const [konfigurasi, setKonfigurasi] = useState<any>({});
  const [editModal, setEditModal]   = useState(false);
  const [editingJurnal, setEditingJurnal] = useState<any>(null);
  const [editForm, setEditForm]     = useState({ materi: '', kegiatan_pembelajaran: '', ttd_guru: '' });
  const [tanggalMulai, setTanggalMulai]     = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [tanggalSelesai, setTanggalSelesai] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => { loadMaster(); }, []);
  useEffect(() => { loadJurnal(); }, [tanggalMulai, tanggalSelesai]);

  const loadMaster = async () => {
    const [j, k, m, cfg] = await Promise.all([
      db.getJadwal({ guruId: user.id }),
      db.getKelas(),
      db.getMapel(),
      db.getKonfigurasi(),
    ]);
    setJadwals(j); setKelasList(k); setMapels(m); setKonfigurasi(cfg);
  };

  const loadJurnal = async () => {
    const list = await db.getJurnalByGuru(user.id, tanggalMulai, tanggalSelesai);
    setJurnals(list);
  };

  const openEdit = (j: any) => {
    setEditingJurnal(j);
    setEditForm({
      materi: j.materi,
      kegiatan_pembelajaran: j.kegiatan_pembelajaran || '',
      ttd_guru: j.ttd_guru || '',
    });
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingJurnal) return;
    await db.updateJurnal(editingJurnal.id, editForm);
    setEditModal(false);
    loadJurnal();
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jurnal Mengajar</h1>
          <p className="text-slate-500 text-sm">Riwayat dan edit jurnal mengajar</p>
        </div>
        {jurnals.length > 0 && (
          <button
            onClick={() => generatePDFJurnal(jurnals, jadwals, kelasList, mapels, user, konfigurasi)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
            <Download size={16} /> Download PDF
          </button>
        )}
      </div>

      {/* Filter tanggal */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Dari</label>
          <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Sampai</label>
          <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      {/* Info jumlah */}
      {jurnals.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{jurnals.length}</span> jurnal
          </p>
        </div>
      )}

      {/* Daftar jurnal */}
      <div className="space-y-3">
        {jurnals.map(j => {
          const jadwal = jadwals.find(jd => jd.id === j.jadwal_id);
          const mapel  = mapels.find(m => m.id === jadwal?.mapel_id);
          const kelas  = kelasList.find(k => k.id === jadwal?.kelas_id);
          return (
            <div key={j.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Tanggal & info jadwal */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{j.tanggal}</span>
                    <span className="font-semibold text-slate-800 text-sm">{mapel?.nama || '-'}</span>
                    <span className="text-slate-400 text-sm">—</span>
                    <span className="text-slate-600 text-sm">{kelas?.nama || '-'}</span>
                    {jadwal && (
                      <span className="text-xs text-slate-400">{jadwal.hari} {jadwal.jam_mulai}–{jadwal.jam_selesai}</span>
                    )}
                  </div>
                  {/* Materi */}
                  <p className="text-sm font-medium text-slate-700 mt-1">{j.materi}</p>
                  {/* Kegiatan */}
                  {j.kegiatan_pembelajaran && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{j.kegiatan_pembelajaran}</p>
                  )}
                </div>
                {/* TTD & tombol edit */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {j.ttd_guru && (
                    <img src={j.ttd_guru} alt="TTD" className="h-10 opacity-80" />
                  )}
                  <button onClick={() => openEdit(j)}
                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                    <Edit size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {jurnals.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            Belum ada jurnal dalam rentang tanggal ini.
          </div>
        )}
      </div>

      {/* Tombol download di bawah kalau jurnal banyak */}
      {jurnals.length > 5 && (
        <div className="flex justify-end">
          <button
            onClick={() => generatePDFJurnal(jurnals, jadwals, kelasList, mapels, user, konfigurasi)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            <Download size={16} /> Download PDF Jurnal Mengajar
          </button>
        </div>
      )}

      {/* Modal Edit */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Jurnal">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Materi</label>
            <input value={editForm.materi} onChange={e => setEditForm({ ...editForm, materi: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kegiatan Pembelajaran</label>
            <textarea value={editForm.kegiatan_pembelajaran}
              onChange={e => setEditForm({ ...editForm, kegiatan_pembelajaran: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanda Tangan</label>
            <SignaturePad value={editForm.ttd_guru} onChange={ttd => setEditForm({ ...editForm, ttd_guru: ttd })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditModal(false)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button onClick={saveEdit}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
              Simpan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
