import { motion } from 'framer-motion';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface KpiCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
}

export default function KpiCard({
  label, value, icon: Icon, gradient, trend, trendDirection, subtitle,
  prefix = '', suffix = '', decimals = 0, delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="stat-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`stat-icon bg-gradient-to-br ${gradient} text-white`}>
          <Icon size={18} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
            trendDirection === 'up' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
            trendDirection === 'down' ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' :
            'bg-surface-100 text-surface-500 dark:bg-surface-800'
          }`}>
            {trendDirection === 'up' && <TrendingUp size={12} />}
            {trendDirection === 'down' && <TrendingDown size={12} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-surface-900 dark:text-white tabular-nums">
          {prefix}<AnimatedCounter value={value} decimals={decimals} />{suffix}
        </span>
      </div>
      {subtitle && <p className="text-xs text-surface-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}