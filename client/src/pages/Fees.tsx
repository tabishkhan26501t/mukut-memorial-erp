import { useState, useEffect, useCallback } from 'react';
import { Plus, Printer } from 'lucide-react';
import { studentService, printService, openPdfInNewTab } from '@/services/data.service';
import api from '@/services/api';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DataTable from '@/components/ui/DataTable';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

const feeTypes = ['tuition', 'transport', 'library', 'sports', 'exam', 'other'];
const feeStatuses = ['pending', 'paid', 'partial', 'overdue'];

export default function Fees() {
  const { hasPermission } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [formData, setFormData] = useState<any>({ studentId: '', amount: '', paidAmount: '0', dueDate: '', status: 'pending', type: 'tuition' });

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get('/fees', { params: { page: pagination.page, limit: pagination.limit } });
      setFees(data.fees || []);
      if (data.pagination) setPagination(data.pagination);
    } catch { toast.error('Failed to load fees'); }
    finally { setLoading(false); }
  }, [pagination.page, pagination.limit]);

  const fetchStudents = async () => {
    try {
      const data = await studentService.getAll({ limit: 200 });
      setStudents((data.students || []).filter((s: any) => s.isActive));
    } catch {}
  };

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { fetchStudents(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.amount || !formData.dueDate) {
      toast.error('Student, amount, and due date are required');
      return;
    }
    try {
      if (selected) {
        await api.put(`/fees/${selected.id}`, formData);
        toast.success('Fee updated');
      } else {
        await api.post('/fees', formData);
        toast.success('Fee created');
      }
      setModalOpen(false);
      setSelected(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = (fee: any) => {
    setConfirmTarget(fee);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/fees/${confirmTarget.id}`);
      toast.success('Fee record deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = { paid: 'badge-success', pending: 'badge-warning', partial: 'badge-info', overdue: 'badge-danger' };
    return <span className={styles[status] || 'badge'}>{status}</span>;
  };

  const columns = [
    { key: 'student', header: 'Student', render: (f: any) => f.student ? `${f.student.name} (${f.student.admissionNo})` : '-' },
    { key: 'type', header: 'Type' },
    { key: 'amount', header: 'Amount', render: (f: any) => `₹${Number(f.amount).toFixed(2)}` },
    { key: 'paidAmount', header: 'Paid', render: (f: any) => `₹${Number(f.paidAmount).toFixed(2)}` },
    { key: 'dueDate', header: 'Due Date', render: (f: any) => formatDate(f.dueDate) },
    { key: 'status', header: 'Status', render: (f: any) => statusBadge(f.status) },
    { key: 'print', header: '', render: (f: any) => hasPermission('REPORT_PRINT') ? (
      <button
        onClick={() => printService.feeReceipt(f.id).then((blob) => openPdfInNewTab(blob, `receipt-${f.id}.pdf`)).catch(() => toast.error('Print failed'))}
        className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        title="Print Receipt"
        aria-label={`Print receipt for ${f.student?.name || f.id}`}
      >
        <Printer size={16} />
      </button>
    ) : null},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Fee Management</h1>
          <p className="text-sm text-surface-500 mt-1">Track student fees and payments</p>
        </div>
        {hasPermission('FEES_CREATE') && (
          <button onClick={() => { setSelected(null); setFormData({ studentId: '', amount: '', paidAmount: '0', dueDate: '', status: 'pending', type: 'tuition' }); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} /> Add Fee Record
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={fees}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination(p => ({ ...p, page }))}
        onEdit={hasPermission('FEES_UPDATE') ? (fee) => {
          setSelected(fee);
          setFormData({
            studentId: fee.studentId,
            amount: fee.amount,
            paidAmount: fee.paidAmount,
            dueDate: fee.dueDate?.split('T')[0] || '',
            status: fee.status,
            type: fee.type,
          });
          setModalOpen(true);
        } : undefined}
        onDelete={hasPermission('FEES_DELETE') ? handleDelete : undefined}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Fee Record"
        message="Are you sure you want to delete this fee record?"
        itemName={`₹${confirmTarget ? Number(confirmTarget.amount).toFixed(2) : ''}`}
        loading={deleting}
      />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title={selected ? 'Edit Fee Record' : 'Add Fee Record'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="f-student">Student *</label>
              <select id="f-student" className="select" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} required>
                <option value="">Select Student</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-type">Fee Type *</label>
              <select id="f-type" className="select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                {feeTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="f-amount">Amount (₹) *</label>
              <input id="f-amount" type="number" step="0.01" min="0" className="input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
            </div>
            <div>
              <label className="label" htmlFor="f-paidAmount">Paid Amount (₹)</label>
              <input id="f-paidAmount" type="number" step="0.01" min="0" className="input" value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="f-dueDate">Due Date *</label>
              <input id="f-dueDate" type="date" className="input" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-status">Status</label>
            <select id="f-status" className="select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              {feeStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selected ? 'Update' : 'Add'} Fee Record</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
