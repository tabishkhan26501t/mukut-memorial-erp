import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { auditService, downloadBlob } from '@/services/data.service';
import type { AuditLog } from '@/types';
import { Pagination } from '@/types';
import DataTable from '@/components/ui/DataTable';
import toast from 'react-hot-toast';

const actionStyles: Record<string, string> = {
  LOGIN: 'bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  LOGOUT: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
  CREATE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  UPDATE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DELETE: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  SAVE: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  IMPORT: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  BACKUP: 'bg-surface-100 text-primary-700 dark:bg-surface-800 dark:text-primary-300',
  RESTORE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
        entity: entity || undefined,
        action: action || undefined,
      });
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch { toast.error('Failed to fetch audit logs'); }
    finally { setLoading(false); }
  }, [pagination.page, search, entity, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    auditService.getEntities().then(setEntities).catch(() => {});
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await auditService.exportCSV({
        search: search || undefined,
        entity: entity || undefined,
        action: action || undefined,
      });
      downloadBlob(blob, 'audit-logs.csv');
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const columns = [
    { key: 'createdAt', header: 'Date & Time', render: (l: AuditLog) => {
      const d = new Date(l.createdAt);
      return (
        <div>
          <p className="text-sm">{d.toLocaleDateString()}</p>
          <p className="text-xs text-surface-500">{d.toLocaleTimeString()}</p>
        </div>
      );
    }},
    { key: 'adminName', header: 'Admin' },
    { key: 'action', header: 'Action', render: (l: AuditLog) => (
      <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${actionStyles[l.action] || 'bg-surface-100 text-surface-600'}`}>
        {l.action}
      </span>
    )},
    { key: 'entity', header: 'Entity', render: (l: AuditLog) => (
      <span className="text-sm font-medium capitalize">{l.entity}{l.entityId ? ` #${l.entityId}` : ''}</span>
    )},
    { key: 'description', header: 'Description' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Activity Log</h1>
          <p className="text-sm text-surface-500 mt-1">Audit trail of all system activities</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary">
          <Download size={18} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="sr-only" htmlFor="audit-search">Search activity log</label>
        <input
          id="audit-search"
          className="input max-w-xs"
          placeholder="Search admin, entity, description..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
        />
        <label className="sr-only" htmlFor="audit-entity">Filter by entity</label>
        <select id="audit-entity" className="select w-auto" value={entity} onChange={(e) => { setEntity(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
          <option value="">All Entities</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <label className="sr-only" htmlFor="audit-action">Filter by action</label>
        <select id="audit-action" className="select w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
          <option value="">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="SAVE">Save</option>
          <option value="IMPORT">Import</option>
          <option value="BACKUP">Backup</option>
          <option value="RESTORE">Restore</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination(p => ({ ...p, page }))}
      />
    </div>
  );
}
