import { motion } from 'framer-motion';
import { Bell, Info, AlertTriangle, Megaphone, Calendar } from 'lucide-react';
import type { DashboardNotices } from '@/types';

const typeIcon: Record<string, typeof Bell> = {
  info: Info, warning: AlertTriangle, announcement: Megaphone, event: Calendar,
};

const typeStyle: Record<string, string> = {
  info: 'border-l-blue-400 bg-blue-50 dark:bg-blue-950/20',
  warning: 'border-l-amber-400 bg-amber-50 dark:bg-amber-950/20',
  announcement: 'border-l-purple-400 bg-purple-50 dark:bg-purple-950/20',
  event: 'border-l-emerald-400 bg-emerald-50 dark:bg-emerald-950/20',
};

interface NoticeBoardProps {
  data: DashboardNotices;
  delay?: number;
}

export default function NoticeBoard({ data, delay = 0 }: NoticeBoardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5"
    >
      <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-4">Notice Board</h3>
      {data.notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-500">
          <Bell size={28} className="mb-2" />
          <p className="text-sm">No notices</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.notices.slice(0, 5).map((n) => {
            const Icon = typeIcon[n.type] || Bell;
            const style = typeStyle[n.type] || typeStyle.info;
            return (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${style}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-white dark:bg-surface-800 shadow-sm">
                  <Icon size={13} className="text-surface-600 dark:text-surface-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{n.title}</p>
                  <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-surface-500 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}