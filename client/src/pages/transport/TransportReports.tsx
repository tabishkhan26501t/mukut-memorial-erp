import { useState, useEffect, useCallback } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { transportService, TransportMeta } from '@/services/transport.service';
import TransportNav from '@/components/transport/TransportNav';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { classService } from '@/services/data.service';

const reportTypes = [
  { value: 'vehicles', label: 'Vehicle List', filters: [] as string[] },
  { value: 'drivers', label: 'Driver List', filters: [] },
  { value: 'routes', label: 'Route List', filters: [] },
  { value: 'route-students', label: 'Route-wise Student List', filters: ['route'] },
  { value: 'vehicle-students', label: 'Vehicle-wise Student List', filters: [] },
  { value: 'transport-students', label: 'Transport Student List', filters: [] },
  { value: 'transport-fees', label: 'Transport Fee Report', filters: ['status', 'class'] },
  { value: 'expired-documents', label: 'Expired Vehicle Documents', filters: [] },
  { value: 'expiring-documents', label: 'Upcoming Document Expirations', filters: [] },
  { value: 'license-expiries', label: 'Driver License Expiry Report', filters: [] },
];

export default function TransportReports() {
  const { hasPermission } = useAuth();
  const [type, setType] = useState('vehicles');
  const [routeId, setRouteId] = useState('');
  const [feeStatus, setFeeStatus] = useState('');
  const [classId, setClassId] = useState('');
  const [meta, setMeta] = useState<TransportMeta | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const current = reportTypes.find((r) => r.value === type) || reportTypes[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (type === 'route-students' && routeId) params.routeId = routeId;
      if (type === 'transport-fees') {
        if (feeStatus) params.status = feeStatus;
        if (classId) params.classId = classId;
      }
      const res = await transportService.report(type, params);
      setData(res.data);
      setLabel(res.label);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load report');
      setData(null);
    } finally { setLoading(false); }
  }, [type, routeId, feeStatus, classId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    transportService.meta().then(setMeta).catch(() => {});
    classService.getAll().then((d) => setClasses(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handlePrint = async () => {
    try {
      const params: Record<string, any> = {};
      if (type === 'route-students' && routeId) params.routeId = routeId;
      if (type === 'transport-fees') {
        if (feeStatus) params.status = feeStatus;
        if (classId) params.classId = classId;
      }
      const blob = await transportService.printReport(type, params);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Print failed');
    }
  };

  const renderTable = () => {
    if (!data) return null;
    if (type === 'vehicles') {
      const items = data.vehicles || [];
      return (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-surface-500 border-b">
            <th className="py-2 pr-3 font-medium">Vehicle ID</th><th className="py-2 pr-3 font-medium">Registration</th><th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Capacity</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Driver</th><th className="py-2 font-medium">Routes</th>
          </tr></thead>
          <tbody>{items.map((v: any) => (
            <tr key={v.id} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td className="py-2 pr-3 font-medium">{v.vehicleId}</td><td className="py-2 pr-3">{v.registrationNumber}</td><td className="py-2 pr-3 capitalize">{v.type}</td>
              <td className="py-2 pr-3">{v.capacity}</td><td className="py-2 pr-3 capitalize">{v.status}</td><td className="py-2 pr-3">{v.driver?.name || '-'}</td>
              <td className="py-2">{v.routes?.map((r: any) => r.name).join(', ') || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if (type === 'drivers') {
      const items = data.staff || [];
      return (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-surface-500 border-b">
            <th className="py-2 pr-3 font-medium">Staff ID</th><th className="py-2 pr-3 font-medium">Name</th><th className="py-2 pr-3 font-medium">Phone</th>
            <th className="py-2 pr-3 font-medium">License No</th><th className="py-2 pr-3 font-medium">License Expiry</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 font-medium">Vehicle</th>
          </tr></thead>
          <tbody>{items.map((s: any) => (
            <tr key={s.id} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td className="py-2 pr-3 font-medium">{s.staffId}</td><td className="py-2 pr-3">{s.name}</td><td className="py-2 pr-3">{s.phone || '-'}</td>
              <td className="py-2 pr-3">{s.licenseNumber || '-'}</td><td className="py-2 pr-3">{s.licenseExpiry ? s.licenseExpiry.split('T')[0] : '-'}</td>
              <td className="py-2 pr-3 capitalize">{s.status}</td><td className="py-2">{s.assignedVehicle?.vehicleId || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if (type === 'routes') {
      const items = data.routes || [];
      return (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-surface-500 border-b">
            <th className="py-2 pr-3 font-medium">Code</th><th className="py-2 pr-3 font-medium">Name</th><th className="py-2 pr-3 font-medium">Vehicle</th>
            <th className="py-2 pr-3 font-medium">Driver</th><th className="py-2 pr-3 font-medium">Stops</th><th className="py-2 pr-3 font-medium">Students</th><th className="py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>{items.map((r: any) => (
            <tr key={r.id} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td className="py-2 pr-3 font-medium">{r.routeCode}</td><td className="py-2 pr-3">{r.name}</td><td className="py-2 pr-3">{r.assignedVehicle?.vehicleId || '-'}</td>
              <td className="py-2 pr-3">{r.assignedDriver?.name || '-'}</td><td className="py-2 pr-3">{r.stops?.map((s: any) => s.name).join(' -> ') || '-'}</td>
              <td className="py-2 pr-3">{r._count?.assignments ?? 0}</td><td className="py-2 capitalize">{r.status}</td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if (type === 'route-students' || type === 'vehicle-students' || type === 'transport-students') {
      const items = data.assignments || [];
      return (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-surface-500 border-b">
            <th className="py-2 pr-3 font-medium">Student</th><th className="py-2 pr-3 font-medium">Admission No</th><th className="py-2 pr-3 font-medium">Class</th>
            {type === 'vehicle-students' && <th className="py-2 pr-3 font-medium">Vehicle</th>}
            <th className="py-2 pr-3 font-medium">Route</th><th className="py-2 pr-3 font-medium">Pickup</th><th className="py-2 font-medium">Drop</th>
          </tr></thead>
          <tbody>{items.map((a: any) => (
            <tr key={a.id} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td className="py-2 pr-3 font-medium">{a.student?.name || '-'}</td><td className="py-2 pr-3">{a.student?.admissionNo || '-'}</td>
              <td className="py-2 pr-3">{a.student?.class ? `${a.student.class.name} ${a.student.class.section || ''}`.trim() : '-'}</td>
              {type === 'vehicle-students' && <td className="py-2 pr-3">{a.route?.assignedVehicle?.vehicleId || '-'}</td>}
              <td className="py-2 pr-3">{a.route?.name || a.routeCode || '-'}</td><td className="py-2 pr-3">{a.pickupStop?.name || '-'}</td>
              <td className="py-2">{a.dropStop?.name || '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if (type === 'transport-fees') {
      const items = data.fees || [];
      return (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg"><p className="text-xs text-surface-500 mb-1">Total</p><p className="font-bold">₹{Number(data.summary?.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
            <div className="p-3 bg-success-50 dark:bg-surface-800 rounded-lg"><p className="text-xs text-success-600 dark:text-success-400 mb-1">Collected</p><p className="font-bold text-success-600 dark:text-success-400">₹{Number(data.summary?.collected || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
            <div className="p-3 bg-danger-50 dark:bg-surface-800 rounded-lg"><p className="text-xs text-danger-600 dark:text-danger-400 mb-1">Pending</p><p className="font-bold text-danger-600 dark:text-danger-400">₹{Number(data.summary?.pending || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-surface-500 border-b">
              <th className="py-2 pr-3 font-medium">Student</th><th className="py-2 pr-3 font-medium">Admission No</th><th className="py-2 pr-3 font-medium">Class</th>
              <th className="py-2 pr-3 font-medium">Amount</th><th className="py-2 pr-3 font-medium">Paid</th><th className="py-2 pr-3 font-medium">Balance</th><th className="py-2 font-medium">Status</th>
            </tr></thead>
            <tbody>{items.map((f: any) => {
              const bal = Number(f.amount || 0) - Number(f.paidAmount || 0);
              return (
                <tr key={f.id} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
                  <td className="py-2 pr-3 font-medium">{f.student?.name || '-'}</td><td className="py-2 pr-3">{f.student?.admissionNo || '-'}</td>
                  <td className="py-2 pr-3">{f.student?.class ? `${f.student.class.name} ${f.student.class.section || ''}`.trim() : '-'}</td>
                  <td className="py-2 pr-3">₹{Number(f.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="py-2 pr-3">₹{Number(f.paidAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="py-2 pr-3">₹{bal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="py-2 capitalize">{f.status}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </>
      );
    }
    if (type === 'expired-documents' || type === 'expiring-documents') {
      const items = data.documents || [];
      return (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-surface-500 border-b">
            <th className="py-2 pr-3 font-medium">Vehicle</th><th className="py-2 pr-3 font-medium">Registration</th><th className="py-2 pr-3 font-medium">Document Type</th>
            <th className="py-2 pr-3 font-medium">Number</th><th className="py-2 pr-3 font-medium">Expiry Date</th><th className="py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>{items.map((d: any, i: number) => (
            <tr key={i} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td className="py-2 pr-3 font-medium">{d.vehicleName}</td><td className="py-2 pr-3">{d.registrationNumber}</td><td className="py-2 pr-3 capitalize">{d.type.replace('_', ' ')}</td>
              <td className="py-2 pr-3">{d.documentNumber || '-'}</td><td className="py-2 pr-3">{d.expiryDate ? d.expiryDate.split('T')[0] : '-'}</td>
              <td className="py-2">{d.status === 'expired' ? 'Expired' : 'Expiring'}</td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if (type === 'license-expiries') {
      const items = data.staff || [];
      return (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-surface-500 border-b">
            <th className="py-2 pr-3 font-medium">Staff ID</th><th className="py-2 pr-3 font-medium">Name</th><th className="py-2 pr-3 font-medium">License No</th>
            <th className="py-2 pr-3 font-medium">Expiry Date</th><th className="py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>{items.map((s: any) => (
            <tr key={s.id} className="border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td className="py-2 pr-3 font-medium">{s.staffId}</td><td className="py-2 pr-3">{s.name}</td><td className="py-2 pr-3">{s.licenseNumber || '-'}</td>
              <td className="py-2 pr-3">{s.licenseExpiry ? s.licenseExpiry.split('T')[0] : '-'}</td>
              <td className="py-2">{s.status === 'expired' ? 'Expired' : 'Expiring'}</td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Transport Reports</h1>
          <p className="text-sm text-surface-500 mt-1">View and print transport reports</p>
        </div>
        <TransportNav />
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <select className="select w-64" value={type} onChange={(e) => { setType(e.target.value); setRouteId(''); setFeeStatus(''); setClassId(''); }}>
          {reportTypes.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {current.filters.includes('route') && (
          <select className="select w-48" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            <option value="">All Routes</option>
            {(meta?.routes || []).map((r) => <option key={r.id} value={r.id}>{r.routeCode} · {r.name}</option>)}
          </select>
        )}
        {current.filters.includes('status') && (
          <select className="select w-36" value={feeStatus} onChange={(e) => setFeeStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['pending', 'paid', 'partial', 'overdue'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {current.filters.includes('class') && (
          <select className="select w-44" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ''}</option>)}
          </select>
        )}
        <button onClick={load} disabled={loading} className="btn-secondary" title="Refresh data"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        {hasPermission('TRANSPORT_REPORT_PRINT') && (
          <button onClick={handlePrint} className="btn-primary"><Printer size={16} /> Print PDF</button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
          <h2 className="font-semibold">{label || 'Report'}</h2>
          {loading && <span className="text-xs text-surface-500">Loading...</span>}
        </div>
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" /></div>
          ) : data ? renderTable() : (
            <p className="text-sm text-surface-500 text-center py-10">No data available for this report.</p>
          )}
        </div>
      </div>
    </div>
  );
}