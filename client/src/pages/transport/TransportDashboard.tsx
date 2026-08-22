import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Route as RouteIcon, Users, UserCog, Wallet, AlertTriangle, FileWarning, MapPin, XCircle, IndianRupee } from 'lucide-react';
import { transportService } from '@/services/transport.service';
import TransportNav from '@/components/transport/TransportNav';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';

export default function TransportDashboard() {
  const { hasPermission } = useAuth();
  const canSeeFees = hasPermission('TRANSPORT_FEES_VIEW');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const d = await transportService.dashboard();
      setData(d);
    } catch { toast.error('Failed to load transport dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <TransportNav />
        <div className="animate-pulse space-y-4">
          <div className="h-28 bg-surface-100 dark:bg-surface-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-surface-100 dark:bg-surface-800 rounded-2xl" />)}</div>
        </div>
      </div>
    );
  }

  const s = data?.stats || {};
  const w = data?.warnings || {};

  const kpis = [
    { label: 'Total Vehicles', value: s.totalVehicles || 0, icon: Bus, tone: 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300' },
    { label: 'Active Vehicles', value: s.activeVehicles || 0, icon: Bus, tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300' },
    { label: 'Under Maintenance', value: s.maintenanceVehicles || 0, icon: FileWarning, tone: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300' },
    { label: 'Total Routes', value: s.totalRoutes || 0, icon: RouteIcon, tone: 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300' },
    { label: 'Active Routes', value: s.activeRoutes || 0, icon: RouteIcon, tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300' },
    { label: 'Students Using Transport', value: s.studentsUsingTransport || 0, icon: Users, tone: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300' },
    { label: 'Drivers / Staff', value: s.transportStaff || 0, icon: UserCog, tone: 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300' },
    { label: 'Unassigned Students', value: s.unassignedStudents || 0, icon: XCircle, tone: s.unassignedStudents > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300' },
  ];

  const feeCards = canSeeFees ? [
    { label: 'Transport Fees Total', value: s.transportFeesTotal || 0, icon: Wallet, tone: 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300' },
    { label: 'Collected', value: s.transportFeesCollected || 0, icon: IndianRupee, tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300' },
    { label: 'Pending', value: s.transportFeesPending || 0, icon: IndianRupee, tone: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300' },
    { label: 'Overdue', value: s.transportFeesOverdue || 0, icon: AlertTriangle, tone: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300' },
  ] : [];

  const quickLinks = [
    { to: '/transport/vehicles', label: 'Manage Vehicles', desc: 'Fleet, capacity & documents' },
    { to: '/transport/drivers', label: 'Drivers & Staff', desc: 'Licenses & assignments' },
    { to: '/transport/routes', label: 'Manage Routes', desc: 'Stops, vehicle & driver' },
    { to: '/transport/students', label: 'Student Assignments', desc: 'Route & stop allocation' },
  ];

  const emptyBox = (title: string, sub: string) => (
    <div className="py-10 text-center text-sm text-surface-500">
      <p className="font-medium text-surface-700 dark:text-surface-300">{title}</p>
      <p className="text-xs mt-1">{sub}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Transportation Dashboard</h1>
          <p className="text-sm text-surface-500 mt-1">Fleet, routes and student transport overview</p>
        </div>
        <TransportNav />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${k.tone}`}>
              <k.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">{k.value}</p>
            <p className="text-xs text-surface-500 mt-0.5">{k.label}</p>
          </div>
        ))}
        {feeCards.map((k) => (
          <div key={k.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${k.tone}`}>
              <k.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">₹{Number(k.value).toLocaleString('en-IN')}</p>
            <p className="text-xs text-surface-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <FileWarning size={16} className="text-amber-500" /> Vehicle Documents
          </h2>
          {w.vehicleDocuments?.length ? (
            <ul className="space-y-2.5">
              {w.vehicleDocuments.map((d: any) => (
                <li key={d.id} className={`flex items-start justify-between gap-3 p-3 rounded-xl text-sm ${d.status === 'expired' ? 'bg-red-50 dark:bg-red-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">{d.vehicleName} <span className="text-xs text-surface-500">({d.registrationNumber})</span></p>
                    <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5 capitalize">{d.type} {d.status === 'expired' ? `expired on ${formatDate(d.expiryDate)}` : `expires in ${d.daysRemaining} day(s)`}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${d.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
                    {d.status === 'expired' ? 'Expired' : 'Expiring'}
                  </span>
                </li>
              ))}
            </ul>
          ) : emptyBox('All documents valid', 'No expiring or expired vehicle documents')}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <UserCog size={16} className="text-amber-500" /> Driver Licenses
          </h2>
          {w.driverLicenses?.length ? (
            <ul className="space-y-2.5">
              {w.driverLicenses.map((d: any) => (
                <li key={d.id} className={`flex items-start justify-between gap-3 p-3 rounded-xl text-sm ${d.status === 'expired' ? 'bg-red-50 dark:bg-red-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">{d.name} <span className="text-xs text-surface-500">({d.staffId})</span></p>
                    <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5">License {d.status === 'expired' ? `expired on ${formatDate(d.licenseExpiry)}` : `expires in ${d.daysRemaining} day(s)`}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${d.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
                    {d.status === 'expired' ? 'Expired' : 'Expiring'}
                  </span>
                </li>
              ))}
            </ul>
          ) : emptyBox('All licenses valid', 'No expiring or expired driver licenses')}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Capacity & Routing Alerts
          </h2>
          {w.capacity?.length || w.routesWithoutVehicle?.length ? (
            <ul className="space-y-2.5">
              {w.capacity.map((c: any) => (
                <li key={`cap-${c.vehicleId}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-sm">
                  <span className="font-medium text-surface-900 dark:text-white">{c.vehicleName} <span className="text-xs text-surface-500">({c.registrationNumber})</span></span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{c.remaining === 0 ? 'Full' : `${c.remaining} seat(s) left`} / {c.capacity}</span>
                </li>
              ))}
              {w.routesWithoutVehicle.map((r: any) => (
                <li key={`rv-${r.id}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-sm">
                  <span className="font-medium text-surface-900 dark:text-white">{r.name} <span className="text-xs text-surface-500">({r.routeCode})</span></span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">No vehicle</span>
                </li>
              ))}
            </ul>
          ) : emptyBox('No routing issues', 'All active routes have vehicles with seats available')}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-red-500" /> Overdue Transport Fees
          </h2>
          {canSeeFees && w.overdueFees?.length ? (
            <ul className="space-y-2.5">
              {w.overdueFees.map((f: any) => (
                <li key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-sm">
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">{f.studentName} <span className="text-xs text-surface-500">({f.admissionNo})</span></p>
                    <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5">Due since {formatDate(f.dueDate)}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">₹{f.dueAmount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : canSeeFees ? emptyBox('All caught up', 'No overdue transport fees') : (
            <p className="text-sm text-surface-500 py-10 text-center">Requires the Transport Fees View permission.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((q) => (
          <Link key={q.to} to={q.to} className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
            <p className="font-semibold text-surface-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">{q.label}</p>
            <p className="text-xs text-surface-500 mt-1">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
