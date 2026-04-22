// @ts-nocheck
import * as XLSX from 'xlsx';

export function downloadTemplate(type: 'siswa' | 'guru' | 'mapel' | 'jadwal') {
  let data: any[] = [];
  let fileName = '';
  if (type === 'siswa') {
    data = [{ nama: 'Budi Santoso', nisn: '1234567890', alamat: 'Jl. Merdeka No. 1', nama_ayah: 'Santoso', nama_ibu: 'Sri Wahyuni', kelas: 'VII A' }];
    fileName = 'template_siswa.xlsx';
  } else if (type === 'guru') {
    data = [{ nama: 'Dra. Siti Fatimah', username: 'siti.fatimah', password: 'guru123' }];
    fileName = 'template_guru.xlsx';
  } else if (type === 'mapel') {
    data = [{ nama: 'Matematika', kode: 'MTK', jp_per_pekan: 4 }];
    fileName = 'template_mapel.xlsx';
  } else if (type === 'jadwal') {
    data = [{ kelas: 'VII A', mapel: 'Matematika', guru: 'Siti Fatimah', hari: 'Senin', jam_mulai: '07:00', jam_selesai: '07:45' }];
    fileName = 'template_jadwal.xlsx';
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, fileName);
}
