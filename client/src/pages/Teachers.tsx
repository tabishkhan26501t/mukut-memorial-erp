import { useState, useEffect, useCallback } from 'react';
import { Plus, Printer } from 'lucide-react';
import { teacherService, printService, openPdfInNewTab } from '@/services/data.service';
import { Teacher, Pagination } from '@/types';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { getInitials } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

export default function Teachers() {
  const { hasPermission } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<any>({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teacherService.getAll({ page: pagination.page, limit: pagination.limit, search });
      setTeachers(data.teachers || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to fetch teachers'); }
    finally { setLoading(false); }
  }, [pagination.page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      experience: formData.experience ? parseInt(formData.experience) : null,
      salary: formData.salary ? parseFloat(formData.salary) : null,
    };
    try {
      if (selectedTeacher) {
        await teacherService.update(selectedTeacher.id, payload);
        toast.success('Teacher updated');
      } else {
        await teacherService.create(payload);
        toast.success('Teacher added');
      }
      setModalOpen(false);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (t: Teacher) => {
    setConfirmTarget(t);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await teacherService.delete(confirmTarget.id);
      toast.success('Deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const openEdit = (t: Teacher) => {
    setSelectedTeacher(t);
    setFormData({
      teacherId: t.teacherId, name: t.name, email: t.email, phone: t.phone || '',
      gender: t.gender || '', qualification: t.qualification || '',
      experience: t.experience || '', salary: t.salary || '',
      dob: t.dob?.split('T')[0] || '', joiningDate: t.joiningDate?.split('T')[0] || '',
      address: t.address || '', subjects: t.subjects || '',
    });
    setModalOpen(true);
  };

  const columns = [
    { key: 'photo', header: 'Photo', render: (t: Teacher) => (
      <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-xs font-bold">
        {t.photo ? <img src={t.photo} className="w-full h-full rounded-full object-cover" alt={`${t.name} photo`} /> : getInitials(t.name)}
      </div>
    )},
    { key: 'teacherId', header: 'Teacher ID' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'qualification', header: 'Qualification' },
    { key: 'experience', header: 'Experience', render: (t: Teacher) => t.experience ? `${t.experience} yrs` : '-' },
    { key: 'isActive', header: 'Status', render: (t: Teacher) => (
      <span className={t.isActive ? 'badge-success' : 'badge-danger'}>{t.isActive ? 'Active' : 'Inactive'}</span>
    )},
    { key: 'print', header: '', render: (t: Teacher) => hasPermission('REPORT_PRINT') ? (
      <button
        onClick={() => printService.teacherProfile(t.id).then((blob) => openPdfInNewTab(blob, `teacher-${t.teacherId}.pdf`)).catch(() => toast.error('Print failed'))}
        className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        title="Print Profile"
        aria-label={`Print profile for ${t.name}`}
      >
        <Printer size={16} />
      </button>
    ) : null},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Teachers</h1>
          <p className="text-sm text-surface-500 mt-1">Manage teacher records</p>
        </div>
        {hasPermission('TEACHER_CREATE') && (
        <button onClick={() => { setSelectedTeacher(null); setFormData({ gender: 'male' }); setModalOpen(true); }} className="btn-primary">
          <Plus size={18} /> Add Teacher
        </button>
      )}
      </div>

      <DataTable columns={columns} data={teachers} loading={loading} searchable searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }}
        pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))}
        onEdit={hasPermission('TEACHER_UPDATE') ? openEdit : undefined} onDelete={hasPermission('TEACHER_DELETE') ? handleDelete : undefined}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedTeacher ? 'Edit Teacher' : 'Add Teacher'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="t-teacherId">Teacher ID *</label>
              <input id="t-teacherId" className="input" value={formData.teacherId || ''} onChange={e => setFormData({...formData, teacherId: e.target.value})} required />
            </div>
            <div>
              <label className="label" htmlFor="t-name">Full Name *</label>
              <input id="t-name" className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
              <label className="label" htmlFor="t-email">Email *</label>
              <input id="t-email" type="email" className="input" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div>
              <label className="label" htmlFor="t-phone">Phone</label>
              <input id="t-phone" className="input" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="t-gender">Gender</label>
              <select id="t-gender" className="select" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="t-qualification">Qualification</label>
              <input id="t-qualification" className="input" value={formData.qualification || ''} onChange={e => setFormData({...formData, qualification: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="t-dob">Date of Birth</label>
              <input id="t-dob" type="date" className="input" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="t-joiningDate">Joining Date</label>
              <input id="t-joiningDate" type="date" className="input" value={formData.joiningDate || ''} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="t-experience">Experience (years)</label>
              <input id="t-experience" type="number" className="input" value={formData.experience ?? ''} onChange={e => setFormData({...formData, experience: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="t-salary">Salary</label>
              <input id="t-salary" type="number" step="0.01" className="input" value={formData.salary ?? ''} onChange={e => setFormData({...formData, salary: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="t-subjects">Subjects</label>
              <input id="t-subjects" className="input" value={formData.subjects || ''} onChange={e => setFormData({...formData, subjects: e.target.value})} placeholder="Comma separated" />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="t-address">Address</label>
              <textarea id="t-address" className="input" rows={2} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selectedTeacher ? 'Update' : 'Add'} Teacher</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Teacher"
        message="Are you sure you want to delete this teacher? This action cannot be undone."
        itemName={confirmTarget?.name}
        loading={deleting}
      />
    </div>
  );
}
