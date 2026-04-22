// @ts-nocheck
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardList,
  FileText, Settings, LogOut, ChevronDown, GraduationCap,
  School, UserCheck, AlertTriangle, Star, Menu, X, BarChart2
} from 'lucide-react';
import type { AppUser as User } from '../App';

interface SidebarProps {
  user: User; // AppUser
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: { id: string; label: string }[];
  role?: 'admin' | 'guru' | 'both';
  requireWalas?: boolean;
}

export default function Sidebar({ user, activePage, onNavigate, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['master', 'akademik']);
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    {
      id: 'master', label: 'Data Master', icon: <Settings size={18} />,
      children: [
        { id: 'kelas', label: 'Kelas' },
        { id: 'mapel', label: 'Mata Pelajaran' },
        { id: 'guru', label: 'Guru' },
        { id: 'siswa', label: 'Siswa' },
        { id: 'mapel-kelas', label: 'Mapel per Kelas' },
      ]
    },
    {
      id: 'akademik', label: 'Akademik', icon: <BookOpen size={18} />,
      children: [
        { id: 'jadwal', label: 'Jadwal Pelajaran' },
        { id: 'presensi-admin', label: 'Rekap Presensi' },
        { id: 'jurnal-admin', label: 'Rekap Jurnal' },
        { id: 'nilai-admin', label: 'Rekap Nilai' },
      ]
    },
    { id: 'pelanggaran-admin', label: 'Pelanggaran', icon: <AlertTriangle size={18} /> },
    { id: 'konfigurasi', label: 'Konfigurasi', icon: <Settings size={18} /> },
  ];

  const guruNav: NavItem[] = [
    { id: 'dashboard-guru', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'presensi-guru', label: 'Presensi & Jurnal', icon: <ClipboardList size={18} /> },
    { id: 'jurnal-guru', label: 'Jurnal Mengajar', icon: <FileText size={18} /> },
    { id: 'nilai-guru', label: 'Input Nilai', icon: <Star size={18} /> },
    ...(user.is_walas ? [{ id: 'walas', label: 'Menu Wali Kelas', icon: <UserCheck size={18} /> }] : []),
  ];

  const navItems = user.role === 'admin' ? adminNav : guruNav;

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-3">
        <img src="https://i.imgur.com/omtDTAj.png" alt="SiKelas" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5" />
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-tight">SiKelas</div>
            <div className="text-slate-400 text-xs">Manajemen Kelas</div>
          </div>
        )}
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
              {user.nama[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.nama}</div>
              <div className="text-slate-400 text-xs capitalize">
                {user.role === 'admin' ? 'Administrator' : user.is_walas ? 'Guru / Wali Kelas' : 'Guru'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => (
          <div key={item.id}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    collapsed ? 'justify-center' : 'justify-between'
                  } text-slate-300 hover:bg-slate-700 hover:text-white`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${openMenus.includes(item.id) ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                <AnimatePresence>
                  {openMenus.includes(item.id) && !collapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => { onNavigate(child.id); setMobileOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              activePage === child.id
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  activePage === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 space-y-1">
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Menu size={18} />
            <span>Ciutkan</span>
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
        >
          <LogOut size={18} />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2 }}
        className="hidden md:flex flex-col bg-slate-800 h-screen sticky top-0 overflow-hidden flex-shrink-0"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 bg-slate-800 text-white p-2 rounded-lg"
        >
          <Menu size={20} />
        </button>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                className="fixed left-0 top-0 h-full w-60 bg-slate-800 z-50 flex flex-col"
              >
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
