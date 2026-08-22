import { useState, useEffect } from 'react';
import { Save, CalendarCheck, Printer } from 'lucide-react';
import { attendanceService, classService, printService, openPdfInNewTab } from '@/services/data.service';
import { Class, Student } from '@/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function Attendance() {
  const { hasPermission } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState<number | null>(null);

  useEffect(() => {
    classService.getAll().then(d => setClasses(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const loadStudents = async () => {
    if (!selectedClass || !date) return;
    setLoading(true);
    try {
      const cls = await classService.getById(parseInt(selectedClass));
      setStudents(cls.students || []);
      const existing = await attendanceService.getAll({ classId: selectedClass, date });
      const attMap: Record<number, string> = {};
      existing.forEach((a: any) => { attMap[a.studentId] = a.status; });
      setAttendance(attMap);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStudents(); }, [selectedClass, date]);

  const toggleStatus = (studentId: number) => {
    const current = attendance[studentId] || 'present';
    const next = current === 'present' ? 'absent' : current === 'absent' ? 'leave' : 'present';
    setAttendance(prev => ({ ...prev, [studentId]: next }));
  };

  const handleSave = async () => {
    if (!date || !selectedClass) { toast.error('Select class and date'); return; }
    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: attendance[s.id] || 'present',
      }));
      await attendanceService.save({ date, records });
      toast.success('Attendance saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePrint = async (student: Student) => {
    setPrinting(student.id);
    try {
      const blob = await printService.attendanceReport({
        studentId: student.id,
        startDate: date,
        endDate: date,
      });
      openPdfInNewTab(blob, `attendance-${student.admissionNo}.pdf`);
    } catch { toast.error('Print failed'); }
    finally { setPrinting(null); }
  };

  const statusColors: Record<string, string> = {
    present: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200',
    absent: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200',
    leave: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200',
  };

  const getStatusCount = (status: string) => Object.values(attendance).filter(v => v === status).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Attendance</h1>
          <p className="text-sm text-surface-500 mt-1">Mark student attendance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="badge-success">Present: {getStatusCount('present')}</span>
            <span className="badge-danger">Absent: {getStatusCount('absent')}</span>
            <span className="badge-warning">Leave: {getStatusCount('leave')}</span>
          </div>
          {hasPermission('ATTENDANCE_CREATE') && (
          <button onClick={handleSave} disabled={saving} className="btn-success">
            <Save size={18} /> {saving ? 'Saving...' : 'Save'}
          </button>
        )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="label" htmlFor="att-class">Class</label>
          <select id="att-class" className="select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="att-date">Date</label>
          <input id="att-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card p-16 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-surface-500">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarCheck size={24} className="text-surface-400" />
          </div>
          <p className="text-base font-semibold text-surface-900 dark:text-white">No students in this class</p>
          <p className="text-sm text-surface-500 mt-1">Select a class with students to mark attendance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {students.map((student) => (
            <div
              key={student.id}
              role="button"
              tabIndex={0}
              aria-label={`Mark attendance for ${student.name}`}
              onClick={() => toggleStatus(student.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleStatus(student.id);
                }
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary-600/60 outline-none ${
                statusColors[attendance[student.id] || 'present']
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-surface-800 rounded-full flex items-center justify-center text-sm font-bold">
                  {student.rollNo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  <p className="text-xs text-surface-600/80 dark:text-surface-300/80">Roll: {student.rollNo}</p>
                </div>
                {hasPermission('REPORT_PRINT') && (
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrint(student); }}
                  className="p-1.5 rounded-lg bg-white/60 dark:bg-surface-800/60 hover:bg-white dark:hover:bg-surface-800 transition-colors"
                  title="Print Attendance Report"
                >
                  {printing === student.id ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Printer size={15} />
                  )}
                </button>
              )}
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs font-semibold uppercase">
                  {attendance[student.id] || 'Present'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
