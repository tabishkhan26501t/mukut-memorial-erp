import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, BookOpen } from 'lucide-react';
import { classService, teacherService } from '@/services/data.service';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function Classes() {
  const { hasPermission } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', section: '', classTeacherId: '' });

  const fetch = async () => {
    try {
      const [clsData, tchData] = await Promise.all([
        classService.getAll(),
        teacherService.getAll({ limit: 100 }),
      ]);
      setClasses(Array.isArray(clsData) ? clsData : []);
      setTeachers(tchData.teachers || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Class name is required'); return; }
    try {
      const payload = { name: formData.name, section: formData.section || null, classTeacherId: formData.classTeacherId ? parseInt(formData.classTeacherId) : null };
      if (selectedClass) {
        await classService.update(selectedClass.id, payload);
        toast.success('Class updated');
      } else {
        await classService.create(payload);
        toast.success('Class created');
      }
      setModalOpen(false);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (cls: any) => {
    setConfirmTarget(cls);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await classService.delete(confirmTarget.id);
      toast.success('Deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const openEdit = (cls: any) => {
    setSelectedClass(cls);
    setFormData({ name: cls.name, section: cls.section || '', classTeacherId: cls.classTeacherId?.toString() || '' });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Classes</h1>
          <p className="text-sm text-surface-500 mt-1">Manage classes and sections</p>
        </div>
        {hasPermission('CLASS_CREATE') && (
        <button onClick={() => { setSelectedClass(null); setFormData({ name: '', section: '', classTeacherId: '' }); setModalOpen(true); }} className="btn-primary">
          <Plus size={18} /> Add Class
        </button>
      )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-surface-200 dark:bg-surface-700 rounded w-2/3 mb-3" />
              <div className="h-4 bg-surface-100 dark:bg-surface-800 rounded w-1/3 mb-4" />
              <div className="h-8 bg-surface-100 dark:bg-surface-800 rounded" />
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-surface-400" />
          </div>
          <p className="text-base font-semibold text-surface-900 dark:text-white">No classes created</p>
          <p className="text-sm text-surface-500 mt-1">Create your first class to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                  </h3>
                  {cls.classTeacher && (
                    <p className="text-sm text-surface-500 mt-0.5">
                      Teacher: {cls.classTeacher.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {hasPermission('CLASS_UPDATE') && (
                    <button onClick={() => openEdit(cls)} aria-label={`Edit ${cls.name}`} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                      <Pencil size={16} />
                    </button>
                  )}
                  {hasPermission('CLASS_DELETE') && (
                    <button onClick={() => handleDelete(cls)} aria-label={`Delete ${cls.name}`} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-4 text-sm text-surface-500">
                <span className="flex items-center gap-1"><Users size={14} /> {cls._count?.students || 0} Students</span>
                <span className="flex items-center gap-1"><BookOpen size={14} /> {cls._count?.subjects || 0} Subjects</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Class"
        message="Are you sure you want to delete this class? All students, subjects, and associated data will also be removed."
        itemName={confirmTarget ? `${confirmTarget.name}${confirmTarget.section ? ` - ${confirmTarget.section}` : ''}` : undefined}
        loading={deleting}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedClass ? 'Edit Class' : 'Add Class'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="c-name">Class Name *</label>
            <input id="c-name" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. 10, 12" required />
          </div>
          <div>
            <label className="label" htmlFor="c-section">Section</label>
            <input id="c-section" className="input" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} placeholder="e.g. A, B, C" />
          </div>
          <div>
            <label className="label" htmlFor="c-classTeacher">Class Teacher</label>
            <select id="c-classTeacher" className="select" value={formData.classTeacherId} onChange={e => setFormData({...formData, classTeacherId: e.target.value})}>
              <option value="">No teacher assigned</option>
              {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {teachers.length === 0 && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">No teachers available. Add teachers first.</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!formData.name}>
              {selectedClass ? 'Update' : 'Create'} Class
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
