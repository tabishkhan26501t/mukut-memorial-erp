import { useState, useEffect, useRef } from 'react';
import { Save, School, Phone, Mail, Globe, Calendar, Upload, User, Server, Database, Activity } from 'lucide-react';
import { settingService, healthService } from '@/services/data.service';
import { useSchool } from '@/context/SchoolContext';
import { HealthInfo } from '@/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function Settings() {
  const { hasPermission } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { refresh: refreshSchool } = useSchool();

  useEffect(() => {
    settingService.getAll()
      .then(data => setSettings(data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
    healthService.get().then(setHealth).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingService.update(settings);
      await refreshSchool();
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const data = await settingService.uploadLogo(fd);
      setSettings({ ...settings, school_logo: data.school_logo });
      await refreshSchool();
      toast.success('Logo uploaded');
    } catch { toast.error('Logo upload failed'); }
    finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  if (loading) return (
    <div className="card p-16 text-center">
      <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-surface-500">Loading settings...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-sm text-surface-500 mt-1">School configuration and preferences</p>
        </div>
        {hasPermission('SETTINGS_UPDATE') && (
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold flex items-center gap-2"><School size={18} /> School Information</h3></div>
          <div className="card-body space-y-4">
            <div>
              <label className="label" htmlFor="set-name">School Name</label>
              <input id="set-name" className="input" value={settings.school_name || ''} onChange={e => setSettings({...settings, school_name: e.target.value})} />
            </div>
            <div>
              <label className="label flex items-center gap-1" htmlFor="set-principal"><User size={14} /> Principal Name</label>
              <input id="set-principal" className="input" value={settings.school_principal || ''} onChange={e => setSettings({...settings, school_principal: e.target.value})} />
            </div>
            <div>
              <label className="label" htmlFor="set-address">Address</label>
              <textarea id="set-address" className="input" rows={2} value={settings.school_address || ''} onChange={e => setSettings({...settings, school_address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1" htmlFor="set-phone"><Phone size={14} /> Phone</label>
                <input id="set-phone" className="input" value={settings.school_phone || ''} onChange={e => setSettings({...settings, school_phone: e.target.value})} />
              </div>
              <div>
                <label className="label flex items-center gap-1" htmlFor="set-email"><Mail size={14} /> Email</label>
                <input id="set-email" className="input" value={settings.school_email || ''} onChange={e => setSettings({...settings, school_email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1" htmlFor="set-website"><Globe size={14} /> Website</label>
                <input id="set-website" className="input" value={settings.school_website || ''} onChange={e => setSettings({...settings, school_website: e.target.value})} />
              </div>
              <div>
                <label className="label flex items-center gap-1" htmlFor="set-academicYear"><Calendar size={14} /> Academic Year</label>
                <input id="set-academicYear" className="input" value={settings.academic_year || ''} onChange={e => setSettings({...settings, academic_year: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="set-logo">School Logo</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {settings.school_logo ? <img src={settings.school_logo} className="w-full h-full object-cover" alt="School logo preview" /> : <School size={20} className="text-surface-500" aria-hidden />}
                </div>
                {hasPermission('SETTINGS_UPDATE') && (
                  <>
                    <input ref={logoInputRef} id="set-logo" type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
                    <label htmlFor="set-logo" className="btn-outline cursor-pointer" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logoInputRef.current?.click(); } }}>
                      <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Logo'}
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Grading System</h3></div>
            <div className="card-body">
              <p className="text-sm text-surface-500 mb-4">Configure grade ranges for the report card</p>
              {(() => {
                let grading;
                try { grading = JSON.parse(settings.grading_system || '{}'); } catch { grading = {}; }
                return (
                  <div className="space-y-3">
                    {Object.entries(grading).map(([grade, range]) => (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center font-bold text-sm">{grade}</span>
                        <input className="input flex-1" aria-label={`${grade} grade range`} value={range as string} onChange={e => {
                          try {
                            const parsed = JSON.parse(settings.grading_system || '{}');
                            parsed[grade] = e.target.value;
                            setSettings({...settings, grading_system: JSON.stringify(parsed)});
                          } catch {}
                        }} />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="font-semibold flex items-center gap-2"><Server size={18} /> Application</h3></div>
            <div className="card-body space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-surface-500"><Activity size={14} /> Version</span>
                <span className="font-medium">{health?.version || '1.0.0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-surface-500"><Database size={14} /> Database</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${health?.database.status === 'up' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {health?.database.status === 'up' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-surface-500">API</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${health?.status === 'ok' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {health?.status === 'ok' ? 'Healthy' : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-surface-500">Uptime</span>
                <span className="font-medium">{health ? `${Math.round(health.uptime / 60)} min` : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
