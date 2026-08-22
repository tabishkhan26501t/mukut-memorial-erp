import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { Users, Activity, PieChart as PieChartIcon, BarChart3, DollarSign } from 'lucide-react';
import type { DashboardCharts } from '@/types';

const GENDER_COLORS: Record<string, string> = { male: '#0369a1', female: '#db2777', other: '#7c3aed' };
const ATTENDANCE_COLORS: Record<string, string> = { present: '#059669', absent: '#dc2626', leave: '#d97706' };

interface ChartsGridProps {
  data: DashboardCharts;
  delay?: number;
}

export default function ChartsGrid({ data, delay = 0 }: ChartsGridProps) {
  const chartList = [
    {
      id: 'enrollment', title: 'Student Enrollment', icon: Users,
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.monthlyEnrollments}>
            <defs><linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0369a1" stopOpacity={0.3}/><stop offset="100%" stopColor="#0369a1" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#0369a1" fill="url(#enrollGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: 'attendance', title: 'Attendance Trends', icon: Activity,
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.attendanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
              {data.attendanceData.map((entry, idx) => (
                <Cell key={idx} fill={ATTENDANCE_COLORS[entry.status] || '#0369a1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: 'gender', title: 'Gender Distribution', icon: PieChartIcon,
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data.genderStats} dataKey="_count" nameKey="gender" cx="50%" cy="50%" outerRadius={80} label={({ gender, _count }) => `${gender}: ${_count}`}>
              {data.genderStats.map((entry) => (
                <Cell key={entry.gender} fill={GENDER_COLORS[entry.gender] || '#0369a1'} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: 'classes', title: 'Class Distribution', icon: BarChart3,
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.classDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#64748b" width={80} />
            <Tooltip />
            <Bar dataKey="_count.students" name="Students" fill="#0369a1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      id: 'fees', title: 'Fee Collection Trend', icon: DollarSign,
      chart: (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.feeTrend}>
            <defs><linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.3}/><stop offset="100%" stopColor="#059669" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="total" stroke="#334155" fill="none" strokeWidth={2} name="Total Due" />
            <Area type="monotone" dataKey="collected" stroke="#059669" fill="url(#feeGrad)" strokeWidth={2} name="Collected" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {chartList.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (delay + idx) * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <item.icon size={14} />
            </div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{item.title}</h3>
          </div>
          {item.chart}
        </motion.div>
      ))}
    </div>
  );
}