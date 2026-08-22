import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { subjectService, classService } from '@/services/data.service';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function Subjects() {
  const { hasPermission } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', classId: '' });

  const fetch = async () => {
    try {
      const params = filterClass ? { classId: filterClass } : {};
      const [subData, clsData] = await Promise.all([
        subjectService.getAll(params),
        classService.getAll(),
      ]);
      setSubjects(Array.isArray(subData) ? subData : []);
      setClasses(Array.isArray(clsData) ? clsData : []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filterClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId) { toast.error('Name and Class required'); return; }
    try {
      if (selected) {
        await subjectService.update(selected.id, { name: formData.name, code: formData.code, classId: parseInt(formData.classId) });
        toast.success('Subject updated');
      } else {
        await subjectService.create({ name: formData.name, code: formData.code, classId: parseInt(formData.classId) });
        toast.success('Subject created');
      }
      setModalOpen(false);
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (subject: any) => {
    setConfirmTarget(subject);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await subjectService.delete(confirmTarget.id);
      toast.success('Deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Subjects</h1>
          <p className="text-sm text-surface-500 mt-1">Manage subjects by class</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="select w-48" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
          </select>
          {hasPermission('SUBJECT_CREATE') && (
            <button onClick={() => { setSelected(null); setFormData({ name: '', code: '', classId: classes[0]?.id?.toString() || '' }); setModalOpen(true); }} className="btn-primary">
              <Plus size={18} /> Add Subject
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-surface-800/50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Code</th>
                <th className="table-header">Class</th>
                <th className="table-header text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm text-surface-500">Loading subjects...</p>
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <ClipboardList size={22} className="text-surface-400" />
                    </div>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">No subjects found</p>
                    <p className="text-xs text-surface-500 mt-1">Add subjects to get started</p>
                  </td>
                </tr>
              ) : subjects.map((s: any) => (
                <tr key={s.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="table-cell font-medium">{s.name}</td>
                  <td className="table-cell text-surface-500">{s.code || '-'}</td>
                  <td className="table-cell">{s.class ? `${s.class.name}${s.class.section ? ' - ' + s.class.section : ''}` : '-'}</td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-2">
                      {hasPermission('SUBJECT_UPDATE') && (
                        <button onClick={() => { setSelected(s); setFormData({ name: s.name, code: s.code || '', classId: s.classId.toString() }); setModalOpen(true); }} aria-label={`Edit ${s.name}`} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                          <Pencil size={16} />
                        </button>
                      )}
                      {hasPermission('SUBJECT_DELETE') && (
                        <button onClick={() => handleDelete(s)} aria-label={`Delete ${s.name}`} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Subject"
        message="Are you sure you want to delete this subject? This action cannot be undone."
        itemName={confirmTarget?.name}
        loading={deleting}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Edit Subject' : 'Add Subject'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="s-name">Subject Name *</label>
            <input id="s-name" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mathematics" required />
          </div>
          <div>
            <label className="label" htmlFor="s-code">Subject Code</label>
            <input id="s-code" className="input" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. MATH101" />
          </div>
          {!selected && (
            <div>
              <label className="label" htmlFor="s-class">Class *</label>
              <select id="s-class" className="select" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} required>
                <option value="">Select Class</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selected ? 'Update' : 'Create'} Subject</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
