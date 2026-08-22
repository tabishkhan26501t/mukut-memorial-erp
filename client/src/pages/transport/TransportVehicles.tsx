import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText } from 'lucide-react';
import { transportService, transportStatusStyles, transportStatusLabel, TransportVehicle } from '@/services/transport.service';
import TransportNav from '@/components/transport/TransportNav';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';

const vehicleTypes = ['bus', 'van', 'mini_bus', 'other'];
const vehicleStatuses = ['active', 'inactive', 'maintenance', 'retired'];
const documentTypes = ['insurance', 'fitness', 'permit', 'pollution', 'registration', 'other'];

const emptyForm = { vehicleId: '', registrationNumber: '', type: 'bus', model: '', manufacturer: '', capacity: 20, status: 'active', purchaseDate: '', registrationDate: '', notes: '' };

export default function TransportVehicles() {
  const { hasPermission } = useAuth();
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TransportVehicle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<TransportVehicle | null>(null);
  const [formData, setFormData] = useState<any>({ ...emptyForm });
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docVehicle, setDocVehicle] = useState<TransportVehicle | null>(null);
  const [docForm, setDocForm] = useState<any>({ type: 'insurance', documentNumber: '', issueDate: '', expiryDate: '', notes: '' });
  const [editingDoc, setEditingDoc] = useState<any>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transportService.vehicles({ page: pagination.page, limit: pagination.limit, search, status: statusFilter || undefined });
      setVehicles(data.vehicles || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load vehicles'); }
    finally { setLoading(false); }
  }, [pagination.page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const loadVehicle = async (id: number) => {
    try {
      const v = await transportService.vehicle(id);
      setDocVehicle(v);
      setDocForm({ type: 'insurance', documentNumber: '', issueDate: '', expiryDate: '', notes: '' });
      setEditingDoc(null);
      setDocModalOpen(true);
    } catch { toast.error('Failed to load vehicle details'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selected) {
        await transportService.updateVehicle(selected.id, formData);
        toast.success('Vehicle updated');
      } else {
        await transportService.createVehicle(formData);
        toast.success('Vehicle created');
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
      await transportService.deleteVehicle(confirmTarget.id);
      toast.success('Vehicle deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docVehicle) return;
    try {
      if (editingDoc) {
        await transportService.updateDocument(editingDoc.id, docForm);
        toast.success('Document updated');
      } else {
        await transportService.addDocument(docVehicle.id, docForm);
        toast.success('Document added');
      }
      setDocModalOpen(false);
      await loadVehicle(docVehicle.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const removeDoc = async (doc: any) => {
    try {
      await transportService.deleteDocument(doc.id);
      toast.success('Document deleted');
      if (docVehicle) await loadVehicle(docVehicle.id);
    } catch { toast.error('Delete failed'); }
  };

  const seatBadge = (v: TransportVehicle) => {
    const remaining = v.remainingSeats ?? 0;
    const tone = remaining <= Math.max(1, Math.round((v.capacity || 0) * 0.15)) ? 'text-amber-600 dark:text-amber-400' : 'text-surface-500';
    return <span title={`Capacity ${v.capacity}`}>{v.assignedStudents ?? 0}/{v.capacity} <span className={`${tone} text-xs`}>({remaining} left)</span></span>;
  };

  const columns = [
    { key: 'vehicleId', header: 'Vehicle ID' },
    { key: 'registrationNumber', header: 'Registration' },
    { key: 'type', header: 'Type', render: (v: TransportVehicle) => <span className="capitalize">{v.type.replace('_', ' ')}</span> },
    { key: 'model', header: 'Model', render: (v: TransportVehicle) => v.model || <span className="text-surface-500">&mdash;</span> },
    { key: 'capacity', header: 'Seats', render: seatBadge },
    { key: 'driver', header: 'Primary Driver', render: (v: TransportVehicle) => v.driver ? v.driver.name : <span className="text-surface-500">&mdash;</span> },
    { key: 'routes', header: 'Routes', render: (v: TransportVehicle) => v.routes?.length ? v.routes.map((r) => r.name).join(', ') : <span className="text-surface-500">&mdash;</span> },
    { key: 'status', header: 'Status', render: (v: TransportVehicle) => <span className={transportStatusStyles[v.status] || 'badge'}>{transportStatusLabel[v.status] || v.status}</span> },
    { key: 'docs', header: 'Documents', render: (v: TransportVehicle) => hasPermission('TRANSPORT_UPDATE') ? (
      <button onClick={() => loadVehicle(v.id)} className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title="Manage documents" aria-label={`Manage documents for ${v.vehicleId}`}>
        <FileText size={15} />
      </button>
    ) : <span className="text-surface-500">{v.documents ? v.documents.length : 0} file(s)</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Vehicle Management</h1>
          <p className="text-sm text-surface-500 mt-1">Fleet details, documents and capacity</p>
        </div>
        <TransportNav />
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input type="text" className="input max-w-xs" placeholder="Search registration, ID, model..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} />
        <select className="select w-44" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}>
          <option value="">All Statuses</option>
          {vehicleStatuses.map((s) => <option key={s} value={s}>{transportStatusLabel[s]}</option>)}
        </select>
        <div className="flex-1" />
        {hasPermission('TRANSPORT_CREATE') && (
          <button onClick={() => { setSelected(null); setFormData({ ...emptyForm }); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} /> Add Vehicle
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={vehicles}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={hasPermission('TRANSPORT_UPDATE') ? (v) => {
          setSelected(v);
          setFormData({
            vehicleId: v.vehicleId, registrationNumber: v.registrationNumber, type: v.type,
            model: v.model || '', manufacturer: v.manufacturer || '', capacity: v.capacity,
            status: v.status, purchaseDate: v.purchaseDate?.split('T')[0] || '', registrationDate: v.registrationDate?.split('T')[0] || '', notes: v.notes || '',
          });
          setModalOpen(true);
        } : undefined}
        onDelete={hasPermission('TRANSPORT_DELETE') ? (v) => { setConfirmTarget(v); setConfirmOpen(true); } : undefined}
      />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title={selected ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vehicle ID *</label>
              <input type="text" className="input" value={formData.vehicleId} onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })} required />
            </div>
            <div>
              <label className="label">Registration Number *</label>
              <input type="text" className="input" value={formData.registrationNumber} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} required />
            </div>
            <div>
              <label className="label">Vehicle Type</label>
              <select className="select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                {vehicleTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {vehicleStatuses.map((s) => <option key={s} value={s}>{transportStatusLabel[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Model</label>
              <input type="text" className="input" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
            </div>
            <div>
              <label className="label">Manufacturer</label>
              <input type="text" className="input" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
            </div>
            <div>
              <label className="label">Capacity (seats) *</label>
              <input type="number" min={1} className="input" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4 col-span-1">
              <div>
                <label className="label">Purchase Date</label>
                <input type="date" className="input" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Registration Date</label>
                <input type="date" className="input" value={formData.registrationDate} onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selected ? 'Update' : 'Add'} Vehicle</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title={`Documents - ${docVehicle?.vehicleId || ''}`} size="lg">
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800">
                  <th className="table-header">Type</th>
                  <th className="table-header">Number</th>
                  <th className="table-header">Expiry</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {(docVehicle?.documents || []).map((d) => (
                  <tr key={d.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                    <td className="table-cell capitalize">{d.type.replace('_', ' ')}</td>
                    <td className="table-cell">{d.documentNumber || '-'}</td>
                    <td className="table-cell">{d.expiryDate ? formatDate(d.expiryDate) : '-'}</td>
                    <td className="table-cell"><span className={transportStatusStyles[d.expiryStatus || 'valid'] || 'badge'}>{(d.expiryStatus || 'valid')}</span></td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1">
                        {hasPermission('TRANSPORT_UPDATE') && (
                          <button onClick={() => { setEditingDoc(d); setDocForm({ type: d.type, documentNumber: d.documentNumber || '', issueDate: d.issueDate?.split('T')[0] || '', expiryDate: d.expiryDate?.split('T')[0] || '', notes: d.notes || '' }); }} className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100">Edit</button>
                        )}
                        {hasPermission('TRANSPORT_UPDATE') && (
                          <button onClick={() => removeDoc(d)} className="p-1.5 rounded-lg text-surface-500 hover:text-accent-red hover:bg-red-50">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!docVehicle?.documents || docVehicle.documents.length === 0) && (
                  <tr><td colSpan={5} className="table-cell text-center text-surface-500 py-8">No documents recorded for this vehicle</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {hasPermission('TRANSPORT_UPDATE') && (
            <form onSubmit={handleDocSubmit} className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{editingDoc ? 'Edit Document' : 'Add Document'}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">Document Type *</label>
                  <select className="select" value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}>
                    {documentTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Document Number</label>
                  <input type="text" className="input" value={docForm.documentNumber} onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })} />
                </div>
                <div>
                  <label className="label">Issue Date</label>
                  <input type="date" className="input" value={docForm.issueDate} onChange={(e) => setDocForm({ ...docForm, issueDate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input" value={docForm.expiryDate} onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Notes</label>
                  <input type="text" className="input" value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="submit" className="btn-primary">{editingDoc ? 'Update' : 'Add'} Document</button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Vehicle"
        message="Deleting a vehicle removes its documents and driver link. Existing student assignments are preserved."
        itemName={confirmTarget?.vehicleId || ''}
        loading={deleting}
      />
    </div>
  );
}