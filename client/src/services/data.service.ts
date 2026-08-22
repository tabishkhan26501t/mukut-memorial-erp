import api from './api';
import { Student, Teacher, Class, Subject, Exam, Attendance, Notification, DashboardStats, DashboardCharts, DashboardActivity, UpcomingExam, DashboardNotices, SystemHealth, BackupRecord, SearchResults, HealthInfo } from '@/types';

const createService = <T>(endpoint: string) => ({
  getAll: async (params?: Record<string, any>): Promise<any> => {
    const { data } = await api.get(`/${endpoint}`, { params });
    return data;
  },
  getById: async (id: number): Promise<T> => {
    const { data } = await api.get(`/${endpoint}/${id}`);
    return data;
  },
  create: async (payload: Record<string, any>): Promise<T> => {
    const { data } = await api.post(`/${endpoint}`, payload);
    return data;
  },
  update: async (id: number, payload: Record<string, any>): Promise<T> => {
    const { data } = await api.put(`/${endpoint}/${id}`, payload);
    return data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/${endpoint}/${id}`);
    return data;
  },
});

export const studentService = {
  ...createService<Student>('students'),
  updatePhoto: async (id: number, formData: FormData) => {
    const { data } = await api.put(`/students/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  importCSV: async (formData: FormData) => {
    const { data } = await api.post('/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

export const teacherService = {
  ...createService<Teacher>('teachers'),
  updatePhoto: async (id: number, formData: FormData) => {
    const { data } = await api.put(`/teachers/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

export const classService = createService<Class>('classes');
export const subjectService = createService<Subject>('subjects');
export const examService = createService<Exam>('exams');

export const markService = {
  getByExam: async (examId: number) => {
    const { data } = await api.get(`/marks/exam/${examId}`);
    return data;
  },
  save: async (examId: number, marks: any[]) => {
    const { data } = await api.post(`/marks/exam/${examId}`, { marks });
    return data;
  },
  getReport: async (studentId: number, examId: number) => {
    const { data } = await api.get(`/marks/report/${studentId}/${examId}`);
    return data;
  },
};

export const attendanceService = {
  getAll: async (params?: Record<string, any>): Promise<Attendance[]> => {
    const { data } = await api.get('/attendance', { params });
    return data;
  },
  save: async (payload: { date: string; records: { studentId: number; status: string; remarks?: string }[] }) => {
    const { data } = await api.post('/attendance', payload);
    return data;
  },
  getReport: async (params: { studentId: number; startDate?: string; endDate?: string }) => {
    const { data } = await api.get('/attendance/report', { params });
    return data;
  },
};

export const documentService = {
  getAll: async (params?: { studentId?: number }): Promise<Document[]> => {
    const { data } = await api.get('/documents', { params });
    return data;
  },
  upload: async (formData: FormData) => {
    const { data } = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/documents/${id}`);
    return data;
  },
  download: async (id: number) => {
    const { data } = await api.get(`/documents/download/${id}`, { responseType: 'blob' });
    return data;
  },
};

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get('/dashboard/stats');
    return data;
  },
  getCharts: async (): Promise<DashboardCharts> => {
    const { data } = await api.get('/dashboard/charts');
    return data;
  },
  getActivity: async (): Promise<DashboardActivity> => {
    const { data } = await api.get('/dashboard/activity');
    return data;
  },
  getUpcomingExams: async (): Promise<{ exams: UpcomingExam[] }> => {
    const { data } = await api.get('/dashboard/upcoming-exams');
    return data;
  },
  getNotices: async (): Promise<DashboardNotices> => {
    const { data } = await api.get('/dashboard/notices');
    return data;
  },
  getHealth: async (): Promise<SystemHealth> => {
    const { data } = await api.get('/dashboard/health');
    return data;
  },
};

export const notificationService = {
  ...createService<Notification>('notifications'),
  markAsRead: async (id: number) => {
    const { data } = await api.put(`/notifications/${id}/read`);
    return data;
  },
};

export const settingService = {
  getAll: async (): Promise<Record<string, string>> => {
    const { data } = await api.get('/settings');
    return data;
  },
  getPublic: async (): Promise<Record<string, string>> => {
    const { data } = await api.get('/settings/public');
    return data;
  },
  update: async (settings: Record<string, string>) => {
    const { data } = await api.put('/settings', settings);
    return data;
  },
  uploadLogo: async (formData: FormData) => {
    const { data } = await api.put('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

export const auditService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get('/audit-logs', { params });
    return data;
  },
  getEntities: async (): Promise<string[]> => {
    const { data } = await api.get('/audit-logs/entities');
    return data;
  },
  exportCSV: async (params?: Record<string, any>): Promise<Blob> => {
    const { data } = await api.get('/audit-logs/export', { params, responseType: 'blob' });
    return data;
  },
};

export const backupService = {
  getAll: async (): Promise<{ backups: BackupRecord[] }> => {
    const { data } = await api.get('/backups');
    return data;
  },
  create: async (): Promise<BackupRecord> => {
    const { data } = await api.post('/backups');
    return data;
  },
  restore: async (filename: string) => {
    const { data } = await api.post('/backups/restore', { filename });
    return data;
  },
  remove: async (filename: string) => {
    const { data } = await api.delete(`/backups/${encodeURIComponent(filename)}`);
    return data;
  },
  download: async (filename: string): Promise<Blob> => {
    const { data } = await api.get(`/backups/download/${encodeURIComponent(filename)}`, { responseType: 'blob' });
    return data;
  },
};

export const searchService = {
  search: async (q: string): Promise<SearchResults> => {
    const { data } = await api.get('/search', { params: { q } });
    return data;
  },
};

export const printService = {
  studentProfile: async (id: number): Promise<Blob> => {
    const { data } = await api.get(`/print/student/${id}`, { responseType: 'blob' });
    return data;
  },
  teacherProfile: async (id: number): Promise<Blob> => {
    const { data } = await api.get(`/print/teacher/${id}`, { responseType: 'blob' });
    return data;
  },
  attendanceReport: async (params: { studentId: number; startDate?: string; endDate?: string }): Promise<Blob> => {
    const { data } = await api.get('/print/attendance', { params, responseType: 'blob' });
    return data;
  },
  marksheet: async (params: { studentId: number; examId: number }): Promise<Blob> => {
    const { data } = await api.get('/print/marksheet', { params, responseType: 'blob' });
    return data;
  },
  feeReceipt: async (id: number): Promise<Blob> => {
    const { data } = await api.get(`/print/fee-receipt/${id}`, { responseType: 'blob' });
    return data;
  },
};

export const healthService = {
  get: async (): Promise<HealthInfo> => {
    const { data } = await api.get('/health');
    return data;
  },
};

export const openPdfInNewTab = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.document.title = filename;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
