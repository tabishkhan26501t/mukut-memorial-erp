import { useEffect, useState, useCallback, useRef } from 'react';
import { AlertCircle, RefreshCw, Users, GraduationCap, BookOpen, School, DollarSign, CalendarCheck, TrendingUp } from 'lucide-react';
import { dashboardService } from '@/services/data.service';
import type { DashboardStats, DashboardCharts, DashboardActivity, UpcomingExam, DashboardNotices, SystemHealth } from '@/types';
import HeroHeader from '@/components/dashboard/HeroHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import ChartsGrid from '@/components/dashboard/ChartsGrid';
import TodayOverview from '@/components/dashboard/TodayOverview';
import RecentActivity from '@/components/dashboard/RecentActivity';
import NoticeBoard from '@/components/dashboard/NoticeBoard';
import UpcomingExams from '@/components/dashboard/UpcomingExams';
import SystemStatus from '@/components/dashboard/SystemStatus';

const kpis = [
  { key: 'totalStudents' as const, label: 'Total Students', icon: 'Users', gradient: 'from-slate-800 to-slate-950', trend: '+12%', trendDirection: 'up' as const },
  { key: 'totalTeachers' as const, label: 'Teachers', icon: 'GraduationCap', gradient: 'from-blue-600 to-sky-700', trend: '+2', trendDirection: 'up' as const },
  { key: 'totalClasses' as const, label: 'Classes', icon: 'School', gradient: 'from-emerald-600 to-teal-700' },
  { key: 'totalSubjects' as const, label: 'Subjects', icon: 'BookOpen', gradient: 'from-amber-600 to-orange-700' },
  { key: 'pendingFees' as const, label: 'Pending Fees', icon: 'DollarSign', gradient: 'from-rose-600 to-pink-700', trend: '₹', trendDirection: 'neutral' as const },
  { key: 'todayAttendance' as const, label: 'Attendance Today', icon: 'CalendarCheck', gradient: 'from-cyan-600 to-sky-700', suffix: '%', decimals: 1 },
];

const iconMap: Record<string, typeof Users> = { Users, GraduationCap, BookOpen, School, DollarSign, CalendarCheck, TrendingUp };

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [activity, setActivity] = useState<DashboardActivity | null>(null);
  const [exams, setExams] = useState<UpcomingExam[]>([]);
  const [notices, setNotices] = useState<DashboardNotices | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, c, a, e, n, h] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getCharts(),
        dashboardService.getActivity(),
        dashboardService.getUpcomingExams(),
        dashboardService.getNotices(),
        dashboardService.getHealth(),
      ]);
      if (!mounted.current) return;
      setStats(s);
      setCharts(c);
      setActivity(a);
      setExams(e.exams);
      setNotices(n);
      setHealth(h);
    } catch (err: any) {
      if (!mounted.current) return;
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => { mounted.current = true; fetchAll(); return () => { mounted.current = false; }; }, [fetchAll]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-surface-200 dark:bg-surface-700 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5"><div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-2/3 mb-3" /><div className="h-7 bg-surface-200 dark:bg-surface-700 rounded w-1/2" /></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5"><div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-1/3 mb-4" /><div className="h-[220px] bg-surface-200 dark:bg-surface-700 rounded" /></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-12 text-center">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <p className="text-lg font-semibold text-surface-900 dark:text-white mb-1">Failed to load dashboard</p>
        <p className="text-sm text-surface-500 mb-6">{error}</p>
        <button onClick={fetchAll} className="btn-primary inline-flex items-center gap-2">
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeroHeader />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const val = stats?.stats ? (stats.stats as any)[kpi.key] ?? 0 : 0;
          const Icon = iconMap[kpi.icon] || TrendingUp;
          return (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={val}
              icon={Icon}
              gradient={kpi.gradient}
              trend={kpi.trend}
              trendDirection={kpi.trendDirection as any}
              suffix={kpi.suffix || ''}
              decimals={kpi.decimals || 0}
              delay={idx}
            />
          );
        })}
      </div>

      {stats && <TodayOverview data={stats} delay={6} />}

      {charts && <ChartsGrid data={charts} delay={7} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {activity && <RecentActivity data={activity} delay={12} />}
        </div>
        <div className="space-y-5">
          <NoticeBoard data={notices || { notices: [] }} delay={13} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UpcomingExams exams={exams} delay={14} />
        {health && <SystemStatus data={health} delay={15} />}
      </div>
    </div>
  );
}