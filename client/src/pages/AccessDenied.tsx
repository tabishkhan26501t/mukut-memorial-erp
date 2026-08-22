import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function AccessDenied() {
  const { user } = useAuth();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100 dark:border-red-900">
          <ShieldAlert size={30} className="text-accent-red" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white tracking-tight">Access Denied</h1>
        <p className="text-sm text-surface-500 mt-2 leading-relaxed">
          {user ? `Your "${user.role || 'Unknown'}" role does not have permission to view this page.` : 'You do not have permission to view this page.'}
          Contact the school administrator if you believe this is a mistake.
        </p>
      </div>
    </div>
  );
}