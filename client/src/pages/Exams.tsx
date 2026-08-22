import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { examService, classService, subjectService } from '@/services/data.service';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

export default function Exams() {
  const { hasPermission } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [formData, setFormData] = useState<any>({ name: '', type: 'Unit Test', classId: '', term: '', startDate: '', endDate: '', subjects: [] });

  const fetch = useCallback(async () => {
    try {
      const [eData, cData] = await Promise.all([examService.getAll({ page: pagination.page, limit: pagination.limit }), classService.getAll()]);
      setExams(eData.exams || []);
      if (eData.pagination) setPagination(eData.pagination);
      setClasses(Array.isArray(cData) ? cData : []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [pagination.page, pagination.limit]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (formData.classId) {
      subjectService.getAll({ classId: formData.classId })
        .then(d => setSubjects(Array.isArray(d) ? d : []))
        .catch(() => setSubjects([]));
    } else {
      setSubjects([]);
    }
  }, [formData.classId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId || !formData.type) {
      toast.error('Name, Class and Type are required');
      return;
    }
    try {
      if (selected) {
        await examService.update(selected.id, formData);
        toast.success('Exam updated');
      } else {
        await examService.create(formData);
        toast.success('Exam created');
      }
      setModalOpen(false);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (exam: any) => {
    setConfirmTarget(exam);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await examService.delete(confirmTarget.id);
      toast.success('Deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const toggleSubject = (subjectId: number) => {
    const exists = formData.subjects.find((s: any) => s.subjectId === subjectId);
    if (exists) {
      setFormData({ ...formData, subjects: formData.subjects.filter((s: any) => s.subjectId !== subjectId) });
    } else {
      setFormData({ ...formData, subjects: [...formData.subjects, { subjectId, maxMarks: 100, passingMarks: 33 }] });
    }
  };

  const examTypes = ['Unit Test', 'Mid Term', 'Final Examination', 'Practical', 'Pre-Board', 'Annual'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Exams</h1>
          <p className="text-sm text-surface-500 mt-1">Create and manage examinations</p>
        </div>
        {hasPermission('EXAMS_CREATE') && (
        <button onClick={() => { setSelected(null); setFormData({ name: '', type: 'Unit Test', classId: '', term: '', startDate: '', endDate: '', subjects: [] }); setModalOpen(true); }} className="btn-primary">
          <Plus size={18} /> Create Exam
        </button>
      )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-surface-200 dark:bg-surface-700 rounded w-2/3 mb-3" />
              <div className="h-4 bg-surface-100 dark:bg-surface-800 rounded w-1/2 mb-4" />
              <div className="h-8 bg-surface-100 dark:bg-surface-800 rounded" />
            </div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-surface-400" />
          </div>
          <p className="text-base font-semibold text-surface-900 dark:text-white">No exams created yet</p>
          <p className="text-sm text-surface-500 mt-1">Create your first exam to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <div key={exam.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white">{exam.name}</h3>
                  <p className="text-sm text-surface-500">{exam.class?.name} &middot; {exam.type}</p>
                  {exam.term && <p className="text-xs text-surface-500 mt-0.5">Term: {exam.term}</p>}
                </div>
                {hasPermission('EXAMS_DELETE') && (
                <button onClick={() => handleDelete(exam)} aria-label={`Delete ${exam.name}`} className="p-2 rounded-lg text-surface-500 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
              </div>
              {exam.startDate && (
                <p className="text-xs text-surface-500">
                  {formatDate(exam.startDate)}{exam.endDate ? ` - ${formatDate(exam.endDate)}` : ''}
                </p>
              )}
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="badge-info">{exam.subjects?.length || 0} subjects</span>
                <span className="badge-success">{exam._count?.marks || 0} marks entered</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
          <p className="text-xs text-surface-500">Page {pagination.page} of {pagination.pages} &middot; {pagination.total} exams</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1} className="btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(pagination.pages, 5) }).map((_, i) => {
              const start = Math.max(1, Math.min(pagination.page - 2, pagination.pages - 4));
              const pageNum = start + i;
              if (pageNum > pagination.pages || pageNum < 1) return null;
              return (
                <button key={pageNum} onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                  className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${pageNum === pagination.page ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:text-surface-400'}`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages} className="btn-ghost p-2 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Exam"
        message="Are you sure you want to delete this exam? All associated marks will be lost."
        itemName={confirmTarget?.name}
        loading={deleting}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Edit Exam' : 'Create Exam'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="e-name">Exam Name *</label>
              <input id="e-name" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mid Term 2025" required />
            </div>
            <div>
              <label className="label" htmlFor="e-type">Exam Type *</label>
              <select id="e-type" className="select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="e-class">Class *</label>
              <select id="e-class" className="select" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} required>
                <option value="">Select Class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="e-term">Term</label>
              <input id="e-term" className="input" value={formData.term || ''} onChange={e => setFormData({...formData, term: e.target.value})} placeholder="e.g. Term 1" />
            </div>
            <div>
              <label className="label" htmlFor="e-startDate">Start Date</label>
              <input id="e-startDate" type="date" className="input" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="e-endDate">End Date</label>
              <input id="e-endDate" type="date" className="input" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>

          {formData.classId && (
            <div>
              <label className="label" htmlFor="e-subjects">Select Subjects</label>
              {subjects.length === 0 ? (
                <p className="text-sm text-surface-500">No subjects found for this class. Add subjects first.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2" id="e-subjects">
                  {subjects.map((s: any) => {
                    const isSelected = formData.subjects.find((fs: any) => fs.subjectId === s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        aria-pressed={!!isSelected}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                          isSelected
                            ? 'bg-primary-50 border-primary-300 dark:bg-primary-950 dark:border-primary-700'
                            : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                        }`}
                        onClick={() => toggleSubject(s.id)}
                      >
                        <p className="text-sm font-medium">{s.name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              {formData.subjects.length > 0 && (
                <p className="text-xs text-primary-600 mt-2">{formData.subjects.length} subject(s) selected</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!formData.name || !formData.classId}>
              {selected ? 'Update' : 'Create'} Exam
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
