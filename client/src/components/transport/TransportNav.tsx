import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bus, UserCog, Route as RouteIcon, Users, Wallet, FileBarChart2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const items = [
  { to: '/transport', label: 'Dashboard', icon: LayoutDashboard, permission: 'TRANSPORT_VIEW', end: true },
  { to: '/transport/vehicles', label: 'Vehicles', icon: Bus, permission: 'TRANSPORT_VIEW' },
  { to: '/transport/drivers', label: 'Drivers & Staff', icon: UserCog, permission: 'TRANSPORT_VIEW' },
  { to: '/transport/routes', label: 'Routes', icon: RouteIcon, permission: 'TRANSPORT_VIEW' },
  { to: '/transport/students', label: 'Students', icon: Users, permission: 'TRANSPORT_VIEW' },
  { to: '/transport/fees', label: 'Fees', icon: Wallet, permission: 'TRANSPORT_FEES_VIEW' },
  { to: '/transport/reports', label: 'Reports', icon: FileBarChart2, permission: 'TRANSPORT_REPORT_VIEW' },
];

export default function TransportNav() {
  const { hasPermission } = useAuth();
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {items.map((item) =>
        hasPermission(item.permission) ? (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`
            }
          >
            <item.icon size={15} />
            {item.label}
          </NavLink>
        ) : null
      )}
    </div>
  );
}
