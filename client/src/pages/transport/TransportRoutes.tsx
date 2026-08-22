import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { transportService, transportStatusStyles, transportStatusLabel, TransportRoute, TransportStop, TransportMeta } from '@/services/transport.service';
import TransportNav from '@/components/transport/TransportNav';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const routeStatuses = ['active', 'inactive'];
const emptyRouteForm = { routeCode: '', name: '', status: 'active', startPoint: '', endPoint: '', assignedVehicleId: '', assignedDriverId: '', notes: '' };
const emptyStopForm = { name: '', pickupTime: '', dropTime: '', landmark: '', notes: '' };

export default function TransportRoutes() {
  const { hasPermission } = useAuth();
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [vehicles, setVehicles] = useState<TransportMeta['vehicles']>([]);
  const [staff, setStaff] = useState<TransportMeta['staff']>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<TransportRoute | null>(null);
  const [formData, setFormData] = useState<any>({ ...emptyRouteForm });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TransportRoute | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailRoute, setDetailRoute] = useState<TransportRoute | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState<TransportStop | null>(null);
  const [stopForm, setStopForm] = useState<any>({ ...emptyStopForm });
  const [stopDeleting, setStopDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transportService.routes({ page: pagination.page, limit: pagination.limit, search });
      setRoutes(data.routes || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load routes'); }
    finally { setLoading(false); }
  }, [pagination.page, search]);

  const fetchMeta = async () => {
    try {
      const meta = await transportService.meta();
      setVehicles(meta.vehicles || []);
      setStaff(meta.staff || []);
    } catch {}
  };

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { fetchMeta(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData, assignedVehicleId: formData.assignedVehicleId ? parseInt(formData.assignedVehicleId, 10) : null, assignedDriverId: formData.assignedDriverId ? parseInt(formData.assignedDriverId, 10) : null };
      if (selected) {
        await transportService.updateRoute(selected.id, payload);
        toast.success('Route updated');
      } else {
        await transportService.createRoute(payload);
        toast.success('Route created');
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
      await transportService.deleteRoute(confirmTarget.id);
      toast.success('Route deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setDeleting(false); }
  };

  const loadDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const route = await transportService.route(id);
      setDetailRoute(route);
    } catch { toast.error('Failed to load route details'); }
    finally { setDetailLoading(false); }
  };

  const handleStopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRoute) return;
    try {
      if (selectedStop) {
        await transportService.updateStop(selectedStop.id, stopForm);
        toast.success('Stop updated');
      } else {
        await transportService.addStop(detailRoute.id, stopForm);
        toast.success('Stop added');
      }
      setStopModalOpen(false);
      setSelectedStop(null);
      loadDetail(detailRoute.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const moveStop = async (index: number, dir: -1 | 1) => {
    if (!detailRoute?.stops) return;
    const order = detailRoute.stops.map((s) => s.id);
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    try {
      await transportService.reorderStops(detailRoute.id, order);
      toast.success('Stops reordered');
      loadDetail(detailRoute.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reorder failed');
    }
  };

  const confirmDeleteStop = async () => {
    if (!selectedStop) return;
    setStopDeleting(true);
    try {
      await transportService.deleteStop(selectedStop.id);
      toast.success('Stop deleted');
      setStopDeleting(false);
      setStopModalOpen(false);
      setSelectedStop(null);
      if (detailRoute) loadDetail(detailRoute.id);
    } catch (err: any) {
      setStopDeleting(false);
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = [
    { key: 'routeCode', header: 'Route Code' },
    { key: 'name', header: 'Name' },
    { key: 'assignedVehicle', header: 'Vehicle', render: (r: TransportRoute) => r.assignedVehicle ? `${r.assignedVehicle.vehicleId} (${r.assignedVehicle.capacity} seats)` : <span className="text-surface-500">&mdash;</span> },
    { key: 'assignedDriver', header: 'Driver', render: (r: TransportRoute) => r.assignedDriver ? r.assignedDriver.name : <span className="text-surface-500">&mdash;</span> },
    { key: 'activeStudents', header: 'Students', render: (r: TransportRoute) => r.activeStudents ?? (r._count?.assignments ?? 0) },
    { key: 'stops', header: 'Stops', render: (r: TransportRoute) => r.stops?.length ?? 0 },
    { key: 'status', header: 'Status', render: (r: TransportRoute) => <span className={transportStatusStyles[r.status] || 'badge'}>{transportStatusLabel[r.status] || r.status}</span> },
    { key: 'detail', header: '', render: (r: TransportRoute) => (
      <button onClick={() => loadDetail(r.id)} className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-surface-800 transition-colors" title="View route details" aria-label={`View route ${r.routeCode}`}><Eye size={15} /></button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Transport Routes</h1>
          <p className="text-sm text-surface-500 mt-1">Routes, vehicles, drivers and stops</p>
        </div>
        <TransportNav />
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input type="text" className="input max-w-xs" placeholder="Search route name or code..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} />
        <div className="flex-1" />
        {hasPermission('TRANSPORT_CREATE') && (
          <button onClick={() => { setSelected(null); setFormData({ ...emptyRouteForm }); setModalOpen(true); }} className="btn-primary">
            <Plus size={18} /> Add Route
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={routes}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        onEdit={hasPermission('TRANSPORT_UPDATE') ? (r) => {
          setSelected(r);
          setFormData({
            routeCode: r.routeCode, name: r.name, status: r.status, startPoint: r.startPoint || '', endPoint: r.endPoint || '',
            assignedVehicleId: r.assignedVehicleId || '', assignedDriverId: r.assignedDriverId || '', notes: r.notes || '',
          });
          setModalOpen(true);
        } : undefined}
        onDelete={hasPermission('TRANSPORT_DELETE') ? (r) => { setConfirmTarget(r); setConfirmOpen(true); } : undefined}
      />

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSelected(null); }} title={selected ? 'Edit Route' : 'Add Route'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Route Code *</label>
              <input type="text" className="input" value={formData.routeCode} onChange={(e) => setFormData({ ...formData, routeCode: e.target.value })} required />
            </div>
            <div>
              <label className="label">Name *</label>
              <input type="text" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Start Point</label>
              <input type="text" className="input" value={formData.startPoint} onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })} />
            </div>
            <div>
              <label className="label">End Point</label>
              <input type="text" className="input" value={formData.endPoint} onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                {routeStatuses.map((s) => <option key={s} value={s}>{transportStatusLabel[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assigned Vehicle</label>
              <select className="select" value={formData.assignedVehicleId} onChange={(e) => setFormData({ ...formData, assignedVehicleId: e.target.value })}>
                <option value="">None</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleId} ({v.registrationNumber}){v.status !== 'active' ? ` - ${transportStatusLabel[v.status]}` : ''}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Assigned Driver</label>
              <select className="select" value={formData.assignedDriverId} onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}>
                <option value="">None</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.staffId})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes</label>
              <input type="text" className="input" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{selected ? 'Update' : 'Add'} Route</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!detailRoute} onClose={() => setDetailRoute(null)} title={detailRoute ? `${detailRoute.name} (${detailRoute.routeCode})` : ''} size="lg">
        {detailLoading || !detailRoute ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                <p className="text-surface-500 text-xs mb-1">Vehicle</p>
                <p className="font-medium">{detailRoute.assignedVehicle ? `${detailRoute.assignedVehicle.vehicleId} (${detailRoute.assignedVehicle.capacity} seats)` : 'Not assigned'}</p>
              </div>
              <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                <p className="text-surface-500 text-xs mb-1">Driver</p>
                <p className="font-medium">{detailRoute.assignedDriver?.name || 'Not assigned'}</p>
              </div>
              <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                <p className="text-surface-500 text-xs mb-1">Active Students</p>
                <p className="font-medium">{detailRoute.assignments?.length ?? 0}</p>
              </div>
              <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                <p className="text-surface-500 text-xs mb-1">Status</p>
                <span className={transportStatusStyles[detailRoute.status] || 'badge'}>{transportStatusLabel[detailRoute.status] || detailRoute.status}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-500">Stops ({detailRoute.stops?.length ?? 0})</h3>
                {hasPermission('TRANSPORT_UPDATE') && (
                  <button onClick={() => { setSelectedStop(null); setStopForm({ ...emptyStopForm }); setStopModalOpen(true); }} className="btn-secondary !py-1.5 !text-xs"><Plus size={14} /> Add Stop</button>
                )}
              </div>
              {detailRoute.stops && detailRoute.stops.length > 0 ? (
                <ul className="divide-y">
                  {detailRoute.stops.map((s, i) => (
                    <li key={s.id} className="py-2.5 flex items-center gap-3">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-primary-50 dark:bg-surface-800 text-primary-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{s.name}</p>
                        <p className="text-xs text-surface-500">
                          {s.pickupTime ? `Pickup ${s.pickupTime}` : ''}{s.pickupTime && s.dropTime ? ' · ' : ''}{s.dropTime ? `Drop ${s.dropTime}` : ''}
                          {s.landmark ? ` · ${s.landmark}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasPermission('TRANSPORT_UPDATE') && (
                          <>
                            <button onClick={() => moveStop(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30" title="Move up"><ArrowUp size={14} /></button>
                            <button onClick={() => moveStop(i, 1)} disabled={i === detailRoute.stops!.length - 1} className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30" title="Move down"><ArrowDown size={14} /></button>
                            <button onClick={() => { setSelectedStop(s); setStopForm({ name: s.name, pickupTime: s.pickupTime || '', dropTime: s.dropTime || '', landmark: s.landmark || '', notes: s.notes || '' }); setStopModalOpen(true); }} className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title="Edit stop">Edit</button>
                            <button onClick={() => { setSelectedStop(s); setStopModalOpen(true); }} className="p-1.5 rounded-lg text-surface-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-surface-800 transition-colors" title="Delete stop">Delete</button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-surface-500 text-center py-6 border border-dashed rounded-lg">No stops yet. Add pickup/drop stops in visiting order.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-500 mb-3">Assigned Students ({detailRoute.assignments?.length ?? 0})</h3>
              {detailRoute.assignments && detailRoute.assignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-surface-500 border-b">
                        <th className="py-2 pr-3 font-medium">Admission No</th>
                        <th className="py-2 pr-3 font-medium">Name</th>
                        <th className="py-2 pr-3 font-medium">Class</th>
                        <th className="py-2 font-medium">Pickup / Drop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRoute.assignments.map((a: any) => (
                        <tr key={a.id} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
                          <td className="py-2 pr-3">{a.student.admissionNo}</td>
                          <td className="py-2 pr-3 font-medium">{a.student.name}</td>
                          <td className="py-2 pr-3">{a.student.class ? `${a.student.class.name} ${a.student.class.section || ''}`.trim() : '-'}</td>
                          <td className="py-2 text-surface-500">{a.pickupStop?.name} → {a.dropStop?.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-surface-500 text-center py-6 border border-dashed rounded-lg">No students assigned to this route.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={stopModalOpen} onClose={() => { setStopModalOpen(false); setSelectedStop(null); }} title={selectedStop ? 'Edit Stop' : 'Add Stop'}>
        <form onSubmit={handleStopSubmit} className="space-y-4">
          <div>
            <label className="label">Stop Name *</label>
            <input type="text" className="input" value={stopForm.name} onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pickup Time</label>
              <input type="time" className="input" value={stopForm.pickupTime} onChange={(e) => setStopForm({ ...stopForm, pickupTime: e.target.value })} />
            </div>
            <div>
              <label className="label">Drop Time</label>
              <input type="time" className="input" value={stopForm.dropTime} onChange={(e) => setStopForm({ ...stopForm, dropTime: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Landmark</label>
            <input type="text" className="input" value={stopForm.landmark} onChange={(e) => setStopForm({ ...stopForm, landmark: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input type="text" className="input" value={stopForm.notes} onChange={(e) => setStopForm({ ...stopForm, notes: e.target.value })} />
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            {selectedStop ? (
              <button type="button" onClick={confirmDeleteStop} disabled={stopDeleting} className="btn-danger !py-2 !text-sm">
                {stopDeleting ? 'Deleting...' : 'Delete Stop'}
              </button>
            ) : <span />}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setStopModalOpen(false); setSelectedStop(null); }} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{selectedStop ? 'Update' : 'Add'} Stop</button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Route"
        message="The route and its stops will be permanently removed. Routes with student assignments cannot be deleted."
        itemName={confirmTarget?.name || ''}
        loading={deleting}
      />
    </div>
  );
}