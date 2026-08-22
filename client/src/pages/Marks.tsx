import { useState, useEffect } from 'react';
import { Save, FileText, Printer } from 'lucide-react';
import { examService, markService, printService, openPdfInNewTab } from '@/services/data.service';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

function calculateGrade(percentage: number | null): string {
  if (percentage === null) return '-';
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export default function Marks() {
  const { hasPermission } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examData, setExamData] = useState<any>(null);
  const [marksData, setMarksData] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingExams(true);
    examService.getAll().then(d => setExams(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoadingExams(false));
  }, []);

  const loadExam = async () => {
    if (!selectedExamId) return;
    setLoading(true);
    setExamData(null);
    try {
      const data = await markService.getByExam(parseInt(selectedExamId));
      setExamData(data);
      const marks: Record<string, Record<number, string>> = {};
      if (data.subjects) {
        data.subjects.forEach((s: any) => {
          marks[s.examSubjectId] = {};
          if (s.marks) {
            s.marks.forEach((m: any) => {
              marks[s.examSubjectId][m.studentId] = m.marksObtained?.toString() || '';
            });
          }
        });
      }
      setMarksData(marks);
    } catch { toast.error('Failed to load exam data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExam(); }, [selectedExamId]);

  const updateMark = (examSubjectId: number, studentId: number, value: string) => {
    setMarksData(prev => ({
      ...prev,
      [examSubjectId]: { ...(prev[examSubjectId] || {}), [studentId]: value },
    }));
  };

  const handleSave = async () => {
    if (!selectedExamId || !examData) return;
    setSaving(true);
    try {
      const marks: any[] = [];
      if (examData.subjects) {
        examData.subjects.forEach((s: any) => {
          const subjectMarks = marksData[s.examSubjectId] || {};
          Object.entries(subjectMarks).forEach(([studentId, marksObtained]) => {
            marks.push({
              examSubjectId: s.examSubjectId,
              studentId: parseInt(studentId),
              subjectId: s.subjectId,
              marksObtained: marksObtained || null,
            });
          });
        });
      }
      await markService.save(parseInt(selectedExamId), marks);
      toast.success('Marks saved successfully');
    } catch { toast.error('Failed to save marks'); }
    finally { setSaving(false); }
  };

  const handlePrintMarksheet = async (studentId: number) => {
    try {
      const blob = await printService.marksheet({ studentId, examId: parseInt(selectedExamId) });
      openPdfInNewTab(blob, `marksheet-${studentId}.pdf`);
    } catch { toast.error('Print failed'); }
  };

  if (!selectedExamId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Marks Entry</h1>
            <p className="text-sm text-surface-500 mt-1">Enter marks for exams with automatic calculations</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="exam-select">Select Exam</label>
            <select id="exam-select" className="select w-full sm:w-64" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
              <option value="">{loadingExams ? 'Loading exams...' : 'Select Exam'}</option>
              {exams.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name} - {e.class?.name} ({e.type})</option>
              ))}
            </select>
            {examData && hasPermission('MARKS_UPDATE') && (
              <button onClick={handleSave} disabled={saving} className="btn-success">
                <Save size={18} /> {saving ? 'Saving...' : 'Save Marks'}
              </button>
            )}
          </div>
        </div>
        <div className="card py-16 text-center">
          <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-surface-400" />
          </div>
          <p className="text-base font-semibold text-surface-900 dark:text-white">No Exam Selected</p>
          <p className="text-sm text-surface-500 mt-1">Select an exam from the dropdown to enter marks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
           <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Marks Entry</h1>
           <p className="text-sm text-surface-500 mt-1">Enter marks for exams with automatic calculations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="exam-select-2">Select Exam</label>
          <select id="exam-select-2" className="select w-full sm:w-64" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
            <option value="">{loadingExams ? 'Loading exams...' : 'Select Exam'}</option>
            {exams.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name} - {e.class?.name} ({e.type})</option>
            ))}
          </select>
          {examData && hasPermission('MARKS_UPDATE') && (
            <button onClick={handleSave} disabled={saving} className="btn-success">
              <Save size={18} /> {saving ? 'Saving...' : 'Save Marks'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card p-16 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-surface-500">Loading exam data...</p>
        </div>
      ) : examData && examData.subjects && examData.subjects.length > 0 ? (
        <div className="space-y-6">
          {examData.subjects.map((subject: any) => {
            const maxMarks = subject.maxMarks || 100;
            const passingMarks = subject.passingMarks || 33;
            return (
              <div key={subject.examSubjectId} className="card">
                <div className="card-header">
                  <h3 className="font-semibold">{subject.subjectName}</h3>
                  <p className="text-xs text-surface-500">Max: {maxMarks} | Passing: {passingMarks}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-50 dark:bg-surface-800/50">
                      <tr>
                        <th className="table-header">Roll No</th>
                        <th className="table-header">Name</th>
                        <th className="table-header">Marks</th>
                        <th className="table-header">Grade</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(subject.marks || []).map((mark: any) => {
                        const val = marksData[subject.examSubjectId]?.[mark.studentId];
                        const numVal = parseFloat(val);
                        const percentage = !isNaN(numVal) ? (numVal / maxMarks) * 100 : null;
                        const grade = calculateGrade(percentage);
                        const passed = numVal >= passingMarks;
                        return (
                          <tr key={mark.studentId} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                            <td className="table-cell font-medium">{mark.rollNo}</td>
                            <td className="table-cell">{mark.studentName}</td>
                            <td className="table-cell">
                              <input
                                type="number"
                                className="input w-24"
                                aria-label={`Marks for ${mark.studentName}`}
                                value={val || ''}
                                onChange={e => updateMark(subject.examSubjectId, mark.studentId, e.target.value)}
                                min="0"
                                max={maxMarks}
                                step="0.5"
                              />
                            </td>
                            <td className="table-cell">
                              <span className={`font-semibold ${grade === 'F' ? 'text-red-700 dark:text-red-400' : grade === 'A+' || grade === 'A' ? 'text-green-700 dark:text-green-400' : ''}`}>
                                {grade}
                              </span>
                            </td>
                            <td className="table-cell">
                              {percentage !== null ? (
                                <span className={passed ? 'badge-success' : 'badge-danger'}>
                                  {passed ? 'Pass' : 'Fail'}
                                </span>
                              ) : <span className="badge-warning">Pending</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Student Summary</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-50 dark:bg-surface-800/50">
                  <tr>
                    <th className="table-header">Roll No</th>
                    <th className="table-header">Name</th>
                    {examData.subjects.map((s: any) => (
                      <th key={s.subjectId} className="table-header">{s.subjectName}</th>
                    ))}
                    <th className="table-header">Total</th>
                    <th className="table-header">Percentage</th>
                    <th className="table-header">Grade</th>
                    <th className="table-header text-right">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {examData.subjects[0]?.marks?.map((student: any) => {
                    let total = 0;
                    let maxTotal = 0;
                    examData.subjects.forEach((s: any) => {
                      const val = parseFloat(marksData[s.examSubjectId]?.[student.studentId]);
                      if (!isNaN(val)) { total += val; maxTotal += s.maxMarks; }
                    });
                    const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : '0.00';
                    const overallGrade = calculateGrade(parseFloat(percentage));
                    return (
                      <tr key={student.studentId} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                        <td className="table-cell font-medium">{student.rollNo}</td>
                        <td className="table-cell">{student.studentName}</td>
                        {examData.subjects.map((s: any) => (
                          <td key={s.subjectId} className="table-cell">
                            {marksData[s.examSubjectId]?.[student.studentId] || '-'}
                          </td>
                        ))}
                        <td className="table-cell font-semibold">{total}/{maxTotal}</td>
                        <td className="table-cell">{percentage}%</td>
                        <td className="table-cell">
                          <span className={`font-bold ${overallGrade === 'F' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                            {overallGrade}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => handlePrintMarksheet(student.studentId)}
                            className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            title="Print Marksheet"
                            aria-label={`Print marksheet for ${student.studentName}`}
                          >
                            <Printer size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-surface-400" />
          </div>
          <p className="text-base font-semibold text-surface-900 dark:text-white">No data available for this exam</p>
          <p className="text-sm text-surface-500 mt-1">Ensure the exam has subjects and students assigned</p>
        </div>
      )}
    </div>
  );
}
