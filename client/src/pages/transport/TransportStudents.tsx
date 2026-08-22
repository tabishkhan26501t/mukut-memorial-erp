import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { transportService, transportStatusStyles, transportStatusLabel, TransportAssignment, TransportMeta } from '@/services/transport.service';
import TransportNav from '@/components/transport/TransportNav';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { classService } from '@/services/data.service';

const assignmentStatuses = ['active', 'inactive', 'suspended'];
const emptyForm = { studentId: '', routeId: '', pickupStopId: '', dropStopId: '', status: 'active', startDate: '', endDate: '', feeAmount: '', feeDueDate: '' };

export default function TransportStudents() {
  const { hasPermission } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
  const [meta, setMeta] = useState<TransportMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<TransportAssignment | null>(null);
  const [formData, setFormData] = useState<any>({ ...emptyForm });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TransportAssignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transportService.assignments({
        page: pagination.page, limit: pagination.limit,
        search: search || undefined,
        classId: classFilter || undefined,
        routeId: routeFilter || undefined,
        status: statusFilter || undefined,
      });
      setAssignments(data.assignments || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load assignments'); }
    finally { setLoading(false); }
  }, [pagination.page, search, classFilter, routeFilter, statusFilter]);

  const fetchMeta = async () => {
    try {
      setMeta(await transportService.meta());
    } catch { toast.error('Failed to load form data'); }
  };

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    fetchMeta();
    classService.getAll().then((d) => setClasses(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        studentId: parseInt(formData.studentId, 10), routeId: parseInt(formData.routeId, 10),
        pickupStopId: parseInt(formData.pickupStopId, 10), dropStopId: parseInt(formData.dropStopId, 10),
        status: formData.status,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        feeAmount: formData.feeAmount || undefined,
        feeDueDate: formData.feeDueDate || undefined,
      };
      if (selected) {
        await transportService.updateAssignment(selected.id, payload);
        toast.success('Assignment updated');
      } else {
        await transportService.createAssignment(payload);
        toast.success('Student assigned to transport');
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
      await transportService.deleteAssignment(confirmTarget.id);
      toast.success('Transport assignment removed');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const formRouteStops: TransportMeta['routes'][number] | undefined = formData.routeId ? meta?.routes.find((r) => r.id === parseInt(formData.routeId, 10)) : undefined;

  const columns = [
    { key: 'student', header: 'Student', render: (a: TransportAssignment) => (
      <div>
        <p className="font-medium">{a.student?.name || `#${a.studentId}`}</p>
        <p className="text-xs text-surface-500">{a.student?.admissionNo} · {a.student?.class ? `${a.student.class.name} ${a.student.class.section || ''}`.trim() : ''}</p>
      </div>
    )},
    { key: 'route', header: 'Route', render: (a: TransportAssignment) => a.route ? `${a.route.routeCode} · ${a.route.name}` : `#${a.routeId}` },
    { key: 'vehicle', header: 'Vehicle', render: (a: TransportAssignment) => a.route?.assignedVehicle?.vehicleId || <span className="text-surface-500">&mdash;</span> },
    { key: 'stops', header: 'Pickup → Drop', render: (a: TransportAssignment) => (
      <span className="text-xs">{a.pickupStop?.name || '—'} <span className="text-surface-400">→</span> {a.dropStop?.name || '—'}</span>
    )},
    { key: 'fee', header: 'Fee', render: (a: TransportAssignment) => a.feeAmount != null ? `₹${Number(a.feeAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : <span className="text-surface-500">&mdash;</span> },
    { key: 'status', header: 'Status', render: (a: TransportAssignment) => <span className={transportStatusStyles[a.status] || 'badge'}>{transportStatusLabel[a.status] || a.status}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Student Transport</h1>
          <p className="text-sm text-surface-500 mt-1">Assign students to routes, vehicles and stops</p>
        </div>
        <TransportNav />
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input type="text" className="input max-w-xs" placeholder="Search student name or admission no..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} />
        <select className="select w-44" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Classes</option>
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ''}</option>)}
        </select>
        <select className="select w-48" value={routeFilter} onChange={(e) => { setRouteFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Routes</option>
          {(meta?.routes || []).map((r) => <option key={r.id} value={r.id}>{r.routeCode} · {r.name}</option>)}
        </select>
        <select className="select w-36" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Statuses</option>
          {assignmentStatuses.map((s) => <option key={s} value={s}>{transportStatusLabel[s]}</option>)}
        </select>
        <div className="flex-1" />
        {hasPermission('TRANSPORT_CREATE') && (
          <button onClick={() => { setSelected(null); setFormData({ ...emptyForm }); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} /> Assign Student
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={hasPermission('TRANSPORT_UPDATE') ? (a) => {
          setSelected(a);
          setFormData({
            studentId: a.studentId, routeId: a.routeId, pickupStopId: a.pickupStopId, dropStopId: a.dropStopId,
            status: a.status, startDate: a.startDate?.split('T')[0] || '', endDate: a.endDate?.split('T')[0] || '',
            feeAmount: a.feeAmount ?? '', feeDueDate: a.feeDueDate?.split('T')[0] || '',
          });
          setModalOpen(true);
        } : undefined}
        onDelete={hasPermission('TRANSPORT_DELETE') ? (a) => { setConfirmTarget(a); setConfirmOpen(true); } : undefined}
      />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title={selected ? 'Edit Transport Assignment' : 'Assign Student'} size="lg">
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
              <label className="label">Route *</label>
              <select className="select" value={formData.routeId} onChange={(e) => setFormData({ ...formData, routeId: e.target.value, pickupStopId: '', dropStopId: '' })} required>
                <option value="">Select route</option>
                {(meta?.routes || []).map((r) => <option key={r.id} value={r.id}>{r.routeCode} · {r.name}{r.status !== 'active' ? ` (${transportStatusLabel[r.status]})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pickup Stop *</label>
              <select className="select" value={formData.pickupStopId} onChange={(e) => setFormData({ ...formData, pickupStopId: e.target.value })} required disabled={!formRouteStops}>
                <option value="">Select pickup stop</option>
                {formRouteStops?.stops?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.pickupTime ? ` (${s.pickupTime})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Drop Stop *</label>
              <select className="select" value={formData.dropStopId} onChange={(e) => setFormData({ ...formData, dropStopId: e.target.value })} required disabled={!formRouteStops}>
                <option value="">Select drop stop</option>
                {formRouteStops?.stops?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.dropTime ? ` (${s.dropTime})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {assignmentStatuses.map((s) => <option key={s} value={s}>{transportStatusLabel[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Fee Amount (₹)</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="Optional" value={formData.feeAmount} onChange={(e) => setFormData({ ...formData, feeAmount: e.target.value })} />
            </div>
            <div>
              <label className="label">Fee Due Date</label>
              <input type="date" className="input" value={formData.feeDueDate} onChange={(e) => setFormData({ ...formData, feeDueDate: e.target.value })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selected ? 'Update' : 'Assign'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Remove Transport Assignment"
        message="The student will no longer be assigned to this route."
        itemName={confirmTarget?.student?.name || ''}
        loading={deleting}
      />
    </div>
  );
}