import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { transportService, TransportFeeRecord, TransportMeta } from '@/services/transport.service';
import TransportNav from '@/components/transport/TransportNav';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';
import { classService } from '@/services/data.service';

const feeStatuses = ['pending', 'paid', 'partial', 'overdue'];
const feeStatusStyle: Record<string, string> = {
  pending: 'badge-warning', paid: 'badge-success', partial: 'badge', overdue: 'badge-danger',
};
const emptyForm = { studentId: '', amount: '', paidAmount: '0', dueDate: '', status: 'pending' };

export default function TransportFees() {
  const { hasPermission } = useAuth();
  const [fees, setFees] = useState<TransportFeeRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, collected: 0, pending: 0 });
  const [classes, setClasses] = useState<any[]>([]);
  const [meta, setMeta] = useState<TransportMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<TransportFeeRecord | null>(null);
  const [formData, setFormData] = useState<any>({ ...emptyForm });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TransportFeeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transportService.fees({
        page: pagination.page, limit: pagination.limit,
        search: search || undefined,
        classId: classFilter || undefined,
        routeId: routeFilter || undefined,
        status: statusFilter || undefined,
      });
      setFees(data.fees || []);
      setSummary(data.summary || { total: 0, collected: 0, pending: 0 });
      setPagination(data.pagination);
    } catch { toast.error('Failed to load transport fees'); }
    finally { setLoading(false); }
  }, [pagination.page, search, classFilter, routeFilter, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    classService.getAll().then((d) => setClasses(Array.isArray(d) ? d : [])).catch(() => {});
    transportService.meta().then(setMeta).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.amount || !formData.dueDate) {
      toast.error('Student, amount, and due date are required');
      return;
    }
    try {
      if (selected) {
        await transportService.updateFee(selected.id, formData);
        toast.success('Transport fee updated');
      } else {
        await transportService.createFee(formData);
        toast.success('Transport fee created');
      }
      setModalOpen(false);
      setSelected(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await transportService.deleteFee(confirmTarget.id);
      toast.success('Transport fee deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const columns = [
    { key: 'student', header: 'Student', render: (f: TransportFeeRecord) => (
      <div>
        <p className="font-medium">{f.student?.name || `#${f.studentId}`}</p>
        {f.student && <p className="text-xs text-surface-500">{f.student.admissionNo} · {f.student.class ? `${f.student.class.name} ${f.student.class.section || ''}`.trim() : ''}</p>}
      </div>
    )},
    { key: 'amount', header: 'Amount', render: (f: TransportFeeRecord) => <span className="font-medium">₹{Number(f.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span> },
    { key: 'paidAmount', header: 'Paid', render: (f: TransportFeeRecord) => <span className={Number(f.paidAmount) > 0 ? 'text-success-600 dark:text-success-400' : 'text-surface-500'}>₹{Number(f.paidAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span> },
    { key: 'pending', header: 'Balance', render: (f: TransportFeeRecord) => {
      const bal = Number(f.amount) - Number(f.paidAmount);
      return <span className={bal > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-surface-500'}>₹{bal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>;
    }},
    { key: 'dueDate', header: 'Due Date', render: (f: TransportFeeRecord) => formatDate(f.dueDate) },
    { key: 'status', header: 'Status', render: (f: TransportFeeRecord) => <span className={feeStatusStyle[f.status] || 'badge'}>{f.status}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Transport Fees</h1>
          <p className="text-sm text-surface-500 mt-1">Transport fee records by student</p>
        </div>
        <TransportNav />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border">
          <p className="text-xs text-surface-500 mb-1">Total Billed</p>
          <p className="text-lg font-bold">₹{summary.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-success-50 dark:bg-surface-800 rounded-xl border">
          <p className="text-xs text-success-600 dark:text-success-400 mb-1">Collected</p>
          <p className="text-lg font-bold text-success-600 dark:text-success-400">₹{summary.collected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-danger-50 dark:bg-surface-800 rounded-xl border">
          <p className="text-xs text-danger-600 dark:text-danger-400 mb-1">Pending</p>
          <p className="text-lg font-bold text-danger-600 dark:text-danger-400">₹{summary.pending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input type="text" className="input max-w-xs" placeholder="Search student name or admission no..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} />
        <select className="select w-40" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Classes</option>
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ''}</option>)}
        </select>
        <select className="select w-44" value={routeFilter} onChange={(e) => { setRouteFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Routes</option>
          {(meta?.routes || []).map((r) => <option key={r.id} value={r.id}>{r.routeCode} · {r.name}</option>)}
        </select>
        <select className="select w-32" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Statuses</option>
          {feeStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        {hasPermission('TRANSPORT_FEES_MANAGE') && (
          <button onClick={() => { setSelected(null); setFormData({ ...emptyForm }); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} /> Add Transport Fee
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={fees}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={hasPermission('TRANSPORT_FEES_MANAGE') ? (f) => {
          setSelected(f);
          setFormData({ studentId: f.studentId, amount: f.amount, paidAmount: f.paidAmount, dueDate: f.dueDate?.split('T')[0] || '', status: f.status });
          setModalOpen(true);
        } : undefined}
        onDelete={hasPermission('TRANSPORT_FEES_MANAGE') ? (f) => { setConfirmTarget(f); setConfirmOpen(true); } : undefined}
      />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title={selected ? 'Edit Transport Fee' : 'Add Transport Fee'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Student *</label>
              <select className="select" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} required disabled={!!selected}>
                <option value="">Select student</option>
                {(meta?.students || []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admissionNo})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" min="0" step="0.01" className="input" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Paid Amount (₹)</label>
              <input type="number" min="0" step="0.01" className="input" value={formData.paidAmount} onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })} />
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" className="input" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {feeStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selected ? 'Update' : 'Add'} Fee</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Transport Fee"
        message="This transport fee record will be permanently removed."
        itemName={confirmTarget?.student?.name || ''}
        loading={deleting}
      />
    </div>
  );
}