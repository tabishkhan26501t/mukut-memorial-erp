import { motion } from 'framer-motion';
import { Clock, UserPlus, Edit, FileText, CheckCircle } from 'lucide-react';
import type { DashboardActivity } from '@/types';

const typeConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  student_added: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  teacher_added: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  exam_created: { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  notice_published: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
};

const defaultConfig = { icon: Edit, color: 'text-surface-600', bg: 'bg-surface-100 dark:bg-surface-800' };

interface RecentActivityProps {
  data: DashboardActivity;
  delay?: number;
}

export default function RecentActivity({ data, delay = 0 }: RecentActivityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5"
    >
      <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-4">Recent Activity</h3>
      {data.activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-500">
          <Clock size={28} className="mb-2" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-200 dark:bg-surface-700" />
          <div className="space-y-0">
            {data.activities.map((a, idx) => {
              const cfg = typeConfig[a.type] || defaultConfig;
              const Icon = cfg.icon;
              return (
                <div key={idx} className="relative flex items-start gap-4 pb-5 last:pb-0">
                  <div className={`relative z-10 w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center ${cfg.color} shrink-0`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{a.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{a.description}</p>
                    <p className="text-xs text-surface-500 mt-1">{a.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}