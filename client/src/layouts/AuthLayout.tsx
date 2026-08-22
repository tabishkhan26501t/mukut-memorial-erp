import { motion } from 'framer-motion';
import { School } from 'lucide-react';
import { useEffect, useState } from 'react';
import { settingService } from '@/services/data.service';
import DemoBadge, { isDemoMode } from '@/components/DemoBadge';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [schoolName, setSchoolName] = useState('xyz school ltd');
  const [schoolLogo, setSchoolLogo] = useState('');

  useEffect(() => {
    settingService.getPublic()
      .then(data => {
        if (data.school_name) setSchoolName(data.school_name);
        if (data.school_logo) setSchoolLogo(data.school_logo);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-violet/10 rounded-full blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary-500/25 overflow-hidden"
          >
            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt={`${schoolName} logo`} /> : <School size={28} className="text-white" aria-hidden />}
          </motion.div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">{schoolName}</h1>
          <p className="text-surface-500 mt-1.5 text-sm">Enterprise Resource Planning</p>
          {isDemoMode() && <div className="mt-3 flex justify-center"><DemoBadge variant="pill" /></div>}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-surface-900 rounded-2xl shadow-modal border border-surface-100 dark:border-surface-800 p-8"
        >
          {children}
        </motion.div>
        <p className="text-center text-xs text-surface-500 mt-6">
          &copy; {new Date().getFullYear()} {schoolName}. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
