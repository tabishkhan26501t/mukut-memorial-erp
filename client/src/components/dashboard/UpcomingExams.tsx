import { motion } from 'framer-motion';
import { Calendar, Clock, FileText } from 'lucide-react';
import type { UpcomingExam } from '@/types';

interface UpcomingExamsProps {
  exams: UpcomingExam[];
  delay?: number;
}

export default function UpcomingExams({ exams, delay = 0 }: UpcomingExamsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card p-5"
    >
      <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-4">Upcoming Exams</h3>
      {exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-500">
          <FileText size={28} className="mb-2" />
          <p className="text-sm">No upcoming exams</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exams.map((exam) => (
            <div key={exam.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {exam.daysRemaining !== null && exam.daysRemaining <= 30 ? exam.daysRemaining : '--'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-900 dark:text-white">{exam.name}</p>
                <p className="text-xs text-surface-500">{exam.className} &middot; {exam.type}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                  <span className="flex items-center gap-1"><Calendar size={11} />{new Date(exam.startDate).toLocaleDateString()}</span>
                  {exam.daysRemaining !== null && (
                    <span className="flex items-center gap-1"><Clock size={11} />{exam.daysRemaining === 0 ? 'Today' : `${exam.daysRemaining}d remaining`}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}