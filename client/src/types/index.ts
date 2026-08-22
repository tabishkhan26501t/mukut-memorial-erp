export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId?: number;
  permissions: string[];
  phone?: string;
  photo?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Class {
  id: number;
  name: string;
  section?: string;
  classTeacherId?: number;
  classTeacher?: { id: number; name: string };
  _count?: { students: number; subjects: number };
  students?: Student[];
  subjects?: Subject[];
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  classId: number;
  class?: Class;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: number;
  admissionNo: string;
  rollNo: number;
  name: string;
  dob: string;
  gender: string;
  bloodGroup?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  aadhaarNo?: string;
  motherAadhaar?: string;
  fatherAadhaar?: string;
  childId?: string;
  apaarId?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  fatherName: string;
  fatherPhone?: string;
  fatherOccupation?: string;
  motherName: string;
  motherPhone?: string;
  motherOccupation?: string;
  guardianName?: string;
  guardianPhone?: string;
  photo?: string;
  classId: number;
  class?: Class;
  isActive: boolean;
  documents?: Document[];
  marks?: Mark[];
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  id: number;
  teacherId: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: string;
  qualification?: string;
  experience?: number;
  joiningDate?: string;
  salary?: number;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  photo?: string;
  bloodGroup?: string;
  subjects?: string;
  isActive: boolean;
  _count?: { classes: number };
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: number;
  studentId: number;
  type: string;
  fileName: string;
  filePath: string;
  fileSize?: string;
  mimeType?: string;
  createdAt: string;
}

export interface Exam {
  id: number;
  name: string;
  term?: string;
  type: string;
  startDate?: string;
  endDate?: string;
  classId: number;
  class?: Class;
  subjects?: ExamSubject[];
  _count?: { marks: number };
  isActive: boolean;
  createdAt: string;
}

export interface ExamSubject {
  id: number;
  examId: number;
  subjectId: number;
  subject?: Subject;
  maxMarks: number;
  passingMarks: number;
  marks?: Mark[];
}

export interface Mark {
  id?: number;
  examSubjectId: number;
  studentId: number;
  subjectId: number;
  examId: number;
  marksObtained?: number;
  grade?: string;
  remarks?: string;
  student?: Student;
  subject?: Subject;
  exam?: Exam;
  examSubject?: ExamSubject;
}

export interface Attendance {
  id: number;
  studentId: number;
  student?: Student;
  date: string;
  status: string;
  remarks?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  targetRole?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DashboardStats {
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    todayAttendance: number;
    totalFees: number;
    collectedFees: number;
    pendingFees: number;
    studentTrend: string;
  };
  recentAdmissions: {
    id: number;
    name: string;
    admissionNo: string;
    gender: string;
    classId: number;
    createdAt: string;
    class: { name: string } | null;
  }[];
}

export interface DashboardCharts {
  monthlyEnrollments: { month: string; count: number }[];
  attendanceData: { date: string; status: string; count: number }[];
  genderStats: { gender: string; _count: number }[];
  classDistribution: { id: number; name: string; section?: string; _count: { students: number } }[];
  feeTrend: { month: string; total: number; collected: number }[];
}

export interface DashboardActivity {
  activities: {
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }[];
}

export interface UpcomingExam {
  id: number;
  name: string;
  type: string;
  className: string;
  startDate: string;
  endDate: string;
  daysRemaining: number | null;
}

export interface DashboardNotices {
  notices: Notification[];
}

export interface SystemHealth {
  database: { status: string; error: string | null };
  api: { status: string; uptime: string };
  authentication: { status: string };
  server: { status: string; memory: string; uptime: string; node: string };
}

export interface AuditLog {
  id: number;
  adminId?: number;
  adminName: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

export interface BackupRecord {
  filename: string;
  size: number;
  sizeMB: number;
  createdAt: string;
  verified: boolean;
}

export interface SearchResults {
  students: { id: number; name: string; admissionNo: string; rollNo: number }[];
  teachers: { id: number; name: string; teacherId: string; email: string }[];
  classes: { id: number; name: string; section?: string }[];
  subjects: { id: number; name: string; code?: string; classId: number }[];
  notifications: { id: number; title: string; type: string }[];
}

export interface HealthInfo {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
  database: { status: string; error: string | null };
}
