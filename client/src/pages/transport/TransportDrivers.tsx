import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { transportService, transportStatusStyles, transportStatusLabel, TransportDriver, TransportMeta } from '@/services/transport.service';
import TransportNav from '@/components/transport/TransportNav';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

const staffStatuses = ['active', 'inactive', 'on_leave'];
const emptyForm = { staffId: '', name: '', phone: '', dob: '', address: '', licenseNumber: '', licenseCategory: '', licenseExpiry: '', joiningDate: '', status: 'active', assignedVehicleId: '', emergencyContact: '', notes: '' };

export default function TransportDrivers() {
  const { hasPermission } = useAuth();
  const [staff, setStaff] = useState<TransportDriver[]>([]);
  const [vehicles, setVehicles] = useState<TransportMeta['vehicles']>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TransportDriver | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<TransportDriver | null>(null);
  const [formData, setFormData] = useState<any>({ ...emptyForm });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transportService.staff({ page: pagination.page, limit: pagination.limit, search, status: statusFilter || undefined });
      setStaff(data.staff || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load drivers'); }
    finally { setLoading(false); }
  }, [pagination.page, search, statusFilter]);

  const fetchMeta = async () => {
    try {
      const meta = await transportService.meta();
      setVehicles(meta.vehicles || []);
    } catch {}
  };

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { fetchMeta(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData, assignedVehicleId: formData.assignedVehicleId ? parseInt(formData.assignedVehicleId, 10) : null };
      if (selected) {
        await transportService.updateStaff(selected.id, payload);
        toast.success('Driver updated');
      } else {
        await transportService.createStaff(payload);
        toast.success('Driver created');
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
      await transportService.deleteStaff(confirmTarget.id);
      toast.success('Driver deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const columns = [
    { key: 'staffId', header: 'Staff ID' },
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone', render: (s: TransportDriver) => s.phone || <span className="text-surface-500">&mdash;</span> },
    { key: 'licenseNumber', header: 'License No', render: (s: TransportDriver) => s.licenseNumber || <span className="text-surface-500">&mdash;</span> },
    { key: 'licenseExpiry', header: 'License Expiry', render: (s: TransportDriver) => (
      <div className="flex items-center gap-2">
        <span>{s.licenseExpiry ? formatDate(s.licenseExpiry) : '-'}</span>
        {s.licenseStatus && s.licenseStatus !== 'valid' && <span className={transportStatusStyles[s.licenseStatus]}>{s.licenseStatus}</span>}
      </div>
    )},
    { key: 'assignedVehicle', header: 'Assigned Vehicle', render: (s: TransportDriver) => s.assignedVehicle ? s.assignedVehicle.vehicleId : <span className="text-surface-500">&mdash;</span> },
    { key: 'status', header: 'Status', render: (s: TransportDriver) => <span className={transportStatusStyles[s.status] || 'badge'}>{transportStatusLabel[s.status] || s.status}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Drivers & Transport Staff</h1>
          <p className="text-sm text-surface-500 mt-1">Drivers, licenses and vehicle assignments</p>
        </div>
        <TransportNav />
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input type="text" className="input max-w-xs" placeholder="Search name, ID, phone, license..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} />
        <select className="select w-44" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Statuses</option>
          {staffStatuses.map((s) => <option key={s} value={s}>{transportStatusLabel[s]}</option>)}
        </select>
        <div className="flex-1" />
        {hasPermission('TRANSPORT_CREATE') && (
          <button onClick={() => { setSelected(null); setFormData({ ...emptyForm }); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} /> Add Driver
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={staff}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={hasPermission('TRANSPORT_UPDATE') ? (s) => {
          setSelected(s);
          setFormData({
            staffId: s.staffId, name: s.name, phone: s.phone || '', dob: s.dob?.split('T')[0] || '', address: s.address || '',
            licenseNumber: s.licenseNumber || '', licenseCategory: s.licenseCategory || '', licenseExpiry: s.licenseExpiry?.split('T')[0] || '',
            joiningDate: s.joiningDate?.split('T')[0] || '', status: s.status, assignedVehicleId: s.assignedVehicleId || '',
            emergencyContact: s.emergencyContact || '', notes: s.notes || '',
          });
          setModalOpen(true);
        } : undefined}
        onDelete={hasPermission('TRANSPORT_DELETE') ? (s) => { setConfirmTarget(s); setConfirmOpen(true); } : undefined}
      />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title={selected ? 'Edit Driver' : 'Add Driver'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Staff ID *</label>
              <input type="text" className="input" value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })} required />
            </div>
            <div>
              <label className="label">Name *</label>
              <input type="text" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
            </div>
            <div>
              <label className="label">License Number</label>
              <input type="text" className="input" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">License Category</label>
              <input type="text" className="input" placeholder="e.g. LMV, HMV" value={formData.licenseCategory} onChange={(e) => setFormData({ ...formData, licenseCategory: e.target.value })} />
            </div>
            <div>
              <label className="label">License Expiry</label>
              <input type="date" className="input" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} />
            </div>
            <div>
              <label className="label">Joining Date</label>
              <input type="date" className="input" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {staffStatuses.map((s) => <option key={s} value={s}>{transportStatusLabel[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assigned Vehicle</label>
              <select className="select" value={formData.assignedVehicleId} onChange={(e) => setFormData({ ...formData, assignedVehicleId: e.target.value })}>
                <option value="">Unassigned</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleId} ({v.registrationNumber})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input type="text" className="input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Emergency Contact</label>
              <input type="tel" className="input" value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" className="input" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selected ? 'Update' : 'Add'} Driver</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Driver"
        message="The driver will be removed. Ensure they are unassigned from vehicles and routes first."
        itemName={confirmTarget?.name || ''}
        loading={deleting}
      />
    </div>
  );
}