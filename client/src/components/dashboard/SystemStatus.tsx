import { motion } from 'framer-motion';
import { Server, Database, Lock, Activity } from 'lucide-react';
import type { SystemHealth } from '@/types';

interface SystemStatusProps {
  data: SystemHealth;
  delay?: number;
}

const statusDot = (status: string) => {
  const colors: Record<string, string> = {
    ok: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
    healthy: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
    error: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]',
    degraded: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-surface-300'}`} />;
};

const items = (data: SystemHealth) => [
  { label: 'Database', icon: Database, value: data.database.status, status: data.database.status },
  { label: 'API Server', icon: Activity, value: `Uptime: ${data.api.uptime}`, status: data.api.status },
  { label: 'Authentication', icon: Lock, value: 'JWT + Refresh', status: data.authentication.status },
  { label: 'Server', icon: Server, value: `Memory: ${data.server.memory}`, status: data.server.status },
];

export default function SystemStatus({ data, delay = 0 }: SystemStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5"
    >
      <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-4">System Health</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items(data).map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-center">
            <div className="w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-surface-600 dark:text-surface-300">
              <item.icon size={15} />
            </div>
            <p className="text-xs font-medium text-surface-700 dark:text-surface-300">{item.label}</p>
            <div className="flex items-center gap-1.5">
              {statusDot(item.status)}
              <span className="text-xs text-surface-500">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}