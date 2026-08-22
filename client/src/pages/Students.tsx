import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Printer } from 'lucide-react';
import { studentService, classService, printService, openPdfInNewTab } from '@/services/data.service';
import { Student, Class, Pagination } from '@/types';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StudentImportModal from '@/components/ui/StudentImportModal';
import toast from 'react-hot-toast';
import { getInitials } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

export default function Students() {
  const { hasPermission } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [importOpen, setImportOpen] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await studentService.getAll({ page: pagination.page, limit: pagination.limit, search });
      setStudents(data.students || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to fetch students'); }
    finally { setLoading(false); }
  }, [pagination.page, search]);

  const fetchClasses = async () => {
    try {
      const data = await classService.getAll();
      setClasses(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { fetchClasses(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        rollNo: formData.rollNo ? parseInt(formData.rollNo) : 0,
        classId: formData.classId ? parseInt(formData.classId) : undefined,
      };
      if (selectedStudent) {
        await studentService.update(selectedStudent.id, payload);
        toast.success('Student updated');
      } else {
        await studentService.create(payload);
        toast.success('Student added');
      }
      setModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (student: Student) => {
    setConfirmTarget(student);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await studentService.delete(confirmTarget.id);
      toast.success('Student deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetchStudents();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      rollNo: student.rollNo,
      name: student.name,
      dob: student.dob?.split('T')[0],
      gender: student.gender,
      bloodGroup: student.bloodGroup || '',
      fatherName: student.fatherName,
      fatherPhone: student.fatherPhone || '',
      motherName: student.motherName,
      motherPhone: student.motherPhone || '',
      email: student.email || '',
      motherAadhaar: student.motherAadhaar || '',
      fatherAadhaar: student.fatherAadhaar || '',
      childId: student.childId || '',
      apaarId: student.apaarId || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      classId: student.classId,
    });
    setModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedStudent(null);
    setFormData({ gender: 'male', classId: classes[0]?.id || '' });
    setModalOpen(true);
  };

  const columns = [
    { key: 'photo', header: 'Photo', render: (s: Student) => (
      <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold">
        {s.photo ? <img src={s.photo} className="w-full h-full rounded-full object-cover" alt={`${s.name} photo`} /> : getInitials(s.name)}
      </div>
    )},
    { key: 'admissionNo', header: 'Admission No' },
    { key: 'rollNo', header: 'Roll No' },
    { key: 'name', header: 'Name' },
    { key: 'gender', header: 'Gender', render: (s: Student) => <span className="capitalize">{s.gender}</span> },
    { key: 'class', header: 'Class', render: (s: Student) => s.class ? `${s.class.name}${s.class.section ? ' - '+s.class.section : ''}` : '-' },
    { key: 'fatherName', header: 'Father' },
    { key: 'isActive', header: 'Status', render: (s: Student) => (
      <span className={s.isActive ? 'badge-success' : 'badge-danger'}>{s.isActive ? 'Active' : 'Inactive'}</span>
    )},
    { key: 'print', header: '', render: (s: Student) => hasPermission('REPORT_PRINT') ? (
      <button
        onClick={(e) => { e.stopPropagation(); printService.studentProfile(s.id).then((blob) => openPdfInNewTab(blob, `student-${s.admissionNo}.pdf`)).catch(() => toast.error('Print failed')); }}
        className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        title="Print Profile"
        aria-label={`Print profile for ${s.name}`}
      >
        <Printer size={16} />
      </button>
    ) : null},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Students</h1>
          <p className="text-sm text-surface-500 mt-1">Manage student records</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('STUDENT_CREATE') && (
            <button onClick={() => setImportOpen(true)} className="btn-secondary">
              <Upload size={18} />
              Import CSV
            </button>
          )}
          {hasPermission('STUDENT_CREATE') && (
            <button onClick={openAddModal} className="btn-primary">
              <Plus size={18} />
              Add Student
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        searchable
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPagination(p => ({ ...p, page: 1 })); }}
        pagination={pagination}
        onPageChange={(page) => setPagination(p => ({ ...p, page }))}
        onEdit={hasPermission('STUDENT_UPDATE') ? openEditModal : undefined}
        onDelete={hasPermission('STUDENT_DELETE') ? handleDelete : undefined}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedStudent ? 'Edit Student' : 'Add Student'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="f-rollNo">Roll Number *</label>
              <input id="f-rollNo" type="number" className="input" value={formData.rollNo ?? ''} onChange={e => setFormData({...formData, rollNo: e.target.value})} required />
            </div>
            <div>
              <label className="label" htmlFor="f-classId">Class *</label>
              <select id="f-classId" className="select" value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})} required>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="f-name">Full Name *</label>
              <input id="f-name" className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
              <label className="label" htmlFor="f-dob">Date of Birth *</label>
              <input id="f-dob" type="date" className="input" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="f-gender">Gender *</label>
              <select id="f-gender" className="select" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} required>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-bloodGroup">Blood Group</label>
              <input id="f-bloodGroup" className="input" value={formData.bloodGroup || ''} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="f-email">Email</label>
              <input id="f-email" type="email" className="input" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="f-aadhaar">Aadhaar Number</label>
              <input id="f-aadhaar" className="input" value={formData.aadhaarNo || ''} onChange={e => setFormData({...formData, aadhaarNo: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="f-motherAadhaar">Mother Aadhaar</label>
              <input id="f-motherAadhaar" className="input" value={formData.motherAadhaar || ''} onChange={e => setFormData({...formData, motherAadhaar: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="f-fatherAadhaar">Father Aadhaar</label>
              <input id="f-fatherAadhaar" className="input" value={formData.fatherAadhaar || ''} onChange={e => setFormData({...formData, fatherAadhaar: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="f-childId">Child ID</label>
              <input id="f-childId" className="input" value={formData.childId || ''} onChange={e => setFormData({...formData, childId: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="f-apaarId">APAAR ID</label>
              <input id="f-apaarId" className="input" value={formData.apaarId || ''} onChange={e => setFormData({...formData, apaarId: e.target.value})} />
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Parent Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="f-fatherName">Father Name *</label>
                <input id="f-fatherName" className="input" value={formData.fatherName || ''} onChange={e => setFormData({...formData, fatherName: e.target.value})} required />
              </div>
              <div>
                <label className="label" htmlFor="f-fatherPhone">Father Phone *</label>
                <input id="f-fatherPhone" className="input" value={formData.fatherPhone || ''} onChange={e => setFormData({...formData, fatherPhone: e.target.value.replace(/\D/g, '').slice(0, 10)})} required pattern="[0-9]{10}" title="10-digit phone number" />
              </div>
              <div>
                <label className="label" htmlFor="f-motherName">Mother Name *</label>
                <input id="f-motherName" className="input" value={formData.motherName || ''} onChange={e => setFormData({...formData, motherName: e.target.value})} required />
              </div>
              <div>
                <label className="label" htmlFor="f-motherPhone">Mother Phone *</label>
                <input id="f-motherPhone" className="input" value={formData.motherPhone || ''} onChange={e => setFormData({...formData, motherPhone: e.target.value.replace(/\D/g, '').slice(0, 10)})} required pattern="[0-9]{10}" title="10-digit phone number" />
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Address</h4>
            <div>
              <label className="label" htmlFor="f-address">Address</label>
              <textarea id="f-address" className="input" rows={2} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="label" htmlFor="f-city">City</label>
                <input id="f-city" className="input" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div>
                <label className="label" htmlFor="f-state">State</label>
                <input id="f-state" className="input" value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">
              {selectedStudent ? 'Update' : 'Add'} Student
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        itemName={confirmTarget?.name}
        loading={deleting}
      />

      <StudentImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); fetchStudents(); }}
      />
    </div>
  );
}
