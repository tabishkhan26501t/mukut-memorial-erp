import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardList,
  FileText, CalendarCheck, Bell, Settings, LogOut, Menu, X,
  Moon, Sun, ChevronDown, School, DollarSign, ScrollText, DatabaseBackup,
  ShieldCheck, Bus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSchool } from '@/context/SchoolContext';
import { getInitials } from '@/utils/format';
import GlobalSearch from '@/components/GlobalSearch';
import DemoBadge, { isDemoMode } from '@/components/DemoBadge';

const sidebarLinks: { to: string; label: string; icon: any; permission?: string }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'DASHBOARD_VIEW' },
  { to: '/students', label: 'Students', icon: Users, permission: 'STUDENT_VIEW' },
  { to: '/teachers', label: 'Teachers', icon: GraduationCap, permission: 'TEACHER_VIEW' },
  { to: '/classes', label: 'Classes', icon: BookOpen, permission: 'CLASS_VIEW' },
  { to: '/subjects', label: 'Subjects', icon: ClipboardList, permission: 'SUBJECT_VIEW' },
  { to: '/exams', label: 'Exams', icon: FileText, permission: 'EXAMS_VIEW' },
  { to: '/marks', label: 'Marks', icon: FileText, permission: 'MARKS_VIEW' },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, permission: 'ATTENDANCE_VIEW' },
  { to: '/fees', label: 'Fees', icon: DollarSign, permission: 'FEES_VIEW' },
  { to: '/transport', label: 'Transportation', icon: Bus, permission: 'TRANSPORT_VIEW' },
  { to: '/notifications', label: 'Notifications', icon: Bell, permission: 'NOTIFICATION_VIEW' },
  { to: '/users', label: 'Users & Roles', icon: ShieldCheck, permission: 'USER_VIEW' },
  { to: '/audit-logs', label: 'Activity Log', icon: ScrollText, permission: 'AUDIT_VIEW' },
  { to: '/backup-center', label: 'Backup Center', icon: DatabaseBackup, permission: 'BACKUP_VIEW' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'SETTINGS_VIEW' },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const { dark, toggle } = useTheme();
  const { schoolName, schoolLogo } = useSchool();
  const location = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleLinks = sidebarLinks.filter((link) => !link.permission || hasPermission(link.permission));

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black z-40 lg:hidden cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-surface-900 border-r border-surface-100 dark:border-surface-800 shadow-sidebar
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm shadow-primary-500/20 overflow-hidden">
              {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt={`${schoolName} logo`} /> : <School size={18} className="text-white" aria-hidden />}
            </div>
              <div>
                <h2 className="text-sm font-bold text-surface-900 dark:text-white leading-tight">{schoolName}</h2>
                <p className="text-[10px] text-surface-500 font-medium tracking-wide">School ERP</p>
                {isDemoMode() && <span className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">DEMO MODE</span>}
              </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="p-3 space-y-0.5 overflow-y-auto" style={{ height: 'calc(100vh - 4rem)' }}>
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
              }
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          ))}

          <div className="border-t border-surface-100 dark:border-surface-800 my-3" />

          <button
            onClick={logout}
            className="sidebar-link sidebar-link-inactive w-full text-accent-red hover:text-accent-red"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-100 dark:border-surface-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
                <LayoutDashboard size={14} />
              </div>
              <div>
                <span className="text-surface-500">Welcome back, </span>
                <span className="font-semibold text-surface-900 dark:text-white">{user?.name}</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block flex-1 max-w-md px-4">
            <GlobalSearch />
          </div>
          {isDemoMode() && <div className="hidden md:block"><DemoBadge /></div>}

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2.5 rounded-xl text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user?.name ? getInitials(user.name) : 'SA'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium leading-tight text-surface-900 dark:text-white">{user?.name}</p>
                  <p className="text-[11px] text-surface-500">{user?.email}</p>
                </div>
                <ChevronDown size={14} className="hidden sm:block text-surface-500" aria-hidden />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-900 rounded-2xl shadow-modal border border-surface-100 dark:border-surface-800 py-1.5 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{user?.email}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
                        {user?.role || 'USER'}
                      </span>
                    </div>
                    <div className="px-1 py-1">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-accent-red rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}