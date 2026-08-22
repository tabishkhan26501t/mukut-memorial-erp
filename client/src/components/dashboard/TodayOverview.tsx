import { motion } from 'framer-motion';
import { GraduationCap, UserPlus } from 'lucide-react';
import type { DashboardStats } from '@/types';

interface TodayOverviewProps {
  data: DashboardStats;
  delay?: number;
}

export default function TodayOverview({ data, delay = 0 }: TodayOverviewProps) {
  const entries = [
    { label: 'Today\'s Attendance', value: `${data.stats.todayAttendance}%`, icon: GraduationCap, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Students', value: data.stats.totalStudents, icon: UserPlus, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-primary-900/30' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5"
    >
      <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-4">Today&apos;s Overview</h3>
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.label} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
            <div className={`w-9 h-9 rounded-lg ${e.bg} flex items-center justify-center ${e.color}`}>
              <e.icon size={18} />
            </div>
            <div>
              <p className="text-xs text-surface-500">{e.label}</p>
              <p className="text-lg font-bold text-surface-900 dark:text-white">{e.value}</p>
            </div>
          </div>
        ))}
        {data.recentAdmissions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">Recent Admissions</p>
            <div className="space-y-1.5">
              {data.recentAdmissions.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-surface-700 dark:text-surface-300">{a.name}</span>
                  <span className="text-surface-500 text-xs">- {a.admissionNo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}