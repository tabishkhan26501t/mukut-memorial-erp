import { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, Info, AlertTriangle, CheckCircle, CheckCheck } from 'lucide-react';
import { notificationService } from '@/services/data.service';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';
export default function Notifications() {
  const { hasPermission } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', type: 'info', targetRole: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getAll({ limit: 50 });
      setNotifications(data.notifications || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required');
      return;
    }
    try {
      await notificationService.create(formData);
      toast.success('Notification sent');
      setModalOpen(false);
      fetch();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (n: any) => {
    setConfirmTarget(n);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await notificationService.delete(confirmTarget.id);
      toast.success('Deleted');
      setConfirmOpen(false);
      setConfirmTarget(null);
      fetch();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      fetch();
    } catch {}
  };

  const typeIcons: Record<string, any> = { info: Info, warning: AlertTriangle, success: CheckCircle, error: AlertTriangle };
  const typeColors: Record<string, string> = {
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Notifications</h1>
          <p className="text-sm text-surface-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {hasPermission('NOTIFICATION_CREATE') && (
        <button onClick={() => { setFormData({ title: '', message: '', type: 'info', targetRole: '' }); setModalOpen(true); }} className="btn-primary">
          <Plus size={18} /> New Notification
        </button>
      )}
      </div>

      {loading ? (
        <div className="card p-16 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-surface-500">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-14 h-14 bg-surface-100 dark:bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={24} className="text-surface-400" />
          </div>
          <p className="text-base font-semibold text-surface-900 dark:text-white">No notifications</p>
          <p className="text-sm text-surface-500 mt-1">Send your first notification</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <div key={n.id} className={`card p-4 ${!n.isRead ? 'ring-1 ring-primary-500/20 bg-primary-50/30 dark:bg-primary-950/20' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl mt-0.5 ${typeColors[n.type] || typeColors.info}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-medium ${!n.isRead ? 'text-primary-700 dark:text-primary-300' : 'text-surface-900 dark:text-white'}`}>
                            {n.title}
                          </h4>
                          {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse-soft" />}
                        </div>
                        <p className="text-sm text-surface-500 mt-1 line-clamp-2">{n.message}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
                            title="Mark as read"
                            aria-label={`Mark "${n.title}" as read`}
                          >
                            <CheckCheck size={14} />
                          </button>
                        )}
                        {hasPermission('NOTIFICATION_MANAGE') && (
                        <button onClick={() => handleDelete(n)} className="p-2 rounded-lg text-surface-500 hover:text-accent-red hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors" title="Delete" aria-label={`Delete "${n.title}"`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                      </div>
                    </div>
                    <p className="text-xs text-surface-500 mt-2">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Notification"
        message="Are you sure you want to delete this notification? This action cannot be undone."
        itemName={confirmTarget?.title}
        loading={deleting}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Notification" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="n-title">Title *</label>
            <input id="n-title" className="input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Notification title" required />
          </div>
          <div>
            <label className="label" htmlFor="n-message">Message *</label>
            <textarea id="n-message" className="input" rows={4} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="Write your notification message..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="n-type">Type</label>
              <select id="n-type" className="select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="n-targetRole">Target Role</label>
<select id="n-targetRole" className="select" value={formData.targetRole} onChange={e => setFormData({...formData, targetRole: e.target.value})}>
                  <option value="">All</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="RECEPTION">Reception</option>
                  <option value="STAFF">Staff</option>
                </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!formData.title || !formData.message}>Send Notification</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
