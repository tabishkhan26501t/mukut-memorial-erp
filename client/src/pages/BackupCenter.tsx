import { useState, useEffect, useCallback } from 'react';
import { Database, Download, Trash2, RotateCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { backupService, downloadBlob } from '@/services/data.service';
import { BackupRecord } from '@/types';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function BackupCenter() {
  const { hasPermission } = useAuth();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backupService.getAll();
      setBackups(data.backups || []);
    } catch { toast.error('Failed to fetch backups'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await backupService.create();
      toast.success('Backup created');
      fetchBackups();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Backup failed');
    }
    finally { setCreating(false); }
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await backupService.restore(restoreTarget.filename);
      toast.success('Database restored');
      setRestoreTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Restore failed');
    }
    finally { setRestoring(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await backupService.remove(deleteTarget.filename);
      toast.success('Backup deleted');
      setDeleteTarget(null);
      fetchBackups();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const handleDownload = async (backup: BackupRecord) => {
    try {
      const blob = await backupService.download(backup.filename);
      downloadBlob(blob, backup.filename);
    } catch { toast.error('Download failed'); }
  };

  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Backup Center</h1>
          <p className="text-sm text-surface-500 mt-1">Database backup management and restore</p>
        </div>
        {hasPermission('BACKUP_CREATE') && (
        <button onClick={handleCreate} disabled={creating} className="btn-primary">
          {creating ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-surface-500">Total Backups</p>
          <p className="text-2xl font-bold mt-1">{backups.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-surface-500">Total Size</p>
          <p className="text-2xl font-bold mt-1">{(totalSize / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-surface-500">Latest Backup</p>
          <p className="text-2xl font-bold mt-1 truncate">{backups[0] ? backups[0].createdAt.slice(0, 10) : '-'}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-semibold">Backup History</h3>
          <p className="text-xs text-surface-500">Old backups are auto-deleted after the retention period</p>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-surface-500">Loading backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-16 text-center">
              <Database size={40} className="mx-auto mb-3 text-surface-300 dark:text-surface-600" />
              <p className="text-sm text-surface-500">No backups yet. Create your first backup.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800">
                  <th className="table-header">File Name</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Size</th>
                  <th className="table-header">Integrity</th>
                  <th className="table-header text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                    <td className="table-cell font-mono text-xs">{b.filename}</td>
                    <td className="table-cell">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="table-cell">{b.sizeMB} MB</td>
                    <td className="table-cell">
                      {b.verified ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 size={14} /> Verified</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle size={14} /> Corrupted</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
{hasPermission('BACKUP_VIEW') && (
<button onClick={() => handleDownload(b)} aria-label={`Download ${b.filename}`} className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title="Download">
                          <Download size={15} />
                        </button>
)}
                        {hasPermission('BACKUP_RESTORE') && (
                        <button onClick={() => setRestoreTarget(b)} aria-label={`Restore ${b.filename}`} className="p-2 rounded-lg text-surface-500 hover:text-amber-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title="Restore">
                          <RotateCcw size={15} />
                        </button>
)}
                        {hasPermission('BACKUP_CREATE') && (
                        <button onClick={() => setDeleteTarget(b)} aria-label={`Delete ${b.filename}`} className="p-2 rounded-lg text-surface-500 hover:text-red-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
        title="Restore Backup"
        message="Restoring this backup will REPLACE the current database with the backup contents. This action cannot be undone."
        itemName={restoreTarget?.filename}
        loading={restoring}
      />
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Backup"
        message="Are you sure you want to delete this backup file?"
        itemName={deleteTarget?.filename}
        loading={deleting}
      />
    </div>
  );
}
