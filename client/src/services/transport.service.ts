import api from './api';

export interface TransportVehicle {
  id: number;
  vehicleId: string;
  registrationNumber: string;
  type: string;
  model?: string;
  manufacturer?: string;
  capacity: number;
  status: string;
  purchaseDate?: string;
  registrationDate?: string;
  notes?: string;
  driver?: { id: number; staffId: string; name: string } | null;
  routes?: { id: number; routeCode: string; name: string; status: string }[];
  documents?: VehicleDocument[];
  assignedStudents?: number;
  remainingSeats?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDocument {
  id: number;
  vehicleId: number;
  type: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  expiryStatus?: 'valid' | 'expiring' | 'expired' | null;
}

export interface TransportDriver {
  id: number;
  staffId: string;
  name: string;
  phone?: string;
  dob?: string;
  address?: string;
  licenseNumber?: string;
  licenseCategory?: string;
  licenseExpiry?: string;
  joiningDate?: string;
  status: string;
  assignedVehicleId?: number | null;
  assignedVehicle?: { id: number; vehicleId: string; registrationNumber: string; status: string } | null;
  emergencyContact?: string;
  notes?: string;
  licenseStatus?: 'valid' | 'expiring' | 'expired' | null;
}

export interface TransportStop {
  id: number;
  routeId: number;
  name: string;
  sequence: number;
  pickupTime?: string;
  dropTime?: string;
  landmark?: string;
  notes?: string;
}

export interface TransportRoute {
  id: number;
  routeCode: string;
  name: string;
  status: string;
  startPoint?: string;
  endPoint?: string;
  assignedVehicleId?: number | null;
  assignedVehicle?: { id: number; vehicleId: string; registrationNumber: string; capacity: number; status: string } | null;
  assignedDriverId?: number | null;
  assignedDriver?: { id: number; staffId: string; name: string; phone?: string; licenseNumber?: string; status: string } | null;
  notes?: string;
  stops?: TransportStop[];
  activeStudents?: number;
  _count?: { assignments: number };
  assignments?: any[];
}

export interface TransportAssignment {
  id: number;
  studentId: number;
  routeId: number;
  pickupStopId: number;
  dropStopId: number;
  status: string;
  startDate: string;
  endDate?: string | null;
  feeAmount?: number | null;
  feeDueDate?: string | null;
  student?: {
    id: number;
    name: string;
    admissionNo: string;
    rollNo: number;
    classId: number;
    isActive: boolean;
    class?: { id: number; name: string; section?: string };
  };
  route?: {
    id: number;
    routeCode: string;
    name: string;
    status: string;
    assignedVehicle?: { id: number; vehicleId: string; registrationNumber: string; capacity: number; status: string; driver?: { id: number; staffId: string; name: string } } | null;
  };
  pickupStop?: { id: number; name: string; sequence: number; pickupTime?: string };
  dropStop?: { id: number; name: string; sequence: number; dropTime?: string };
  createdAt: string;
  updatedAt: string;
}

export interface TransportFeeRecord {
  id: number;
  studentId: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  type: string;
  student?: { id: number; name: string; admissionNo: string; classId: number; class?: { id: number; name: string; section?: string } };
}

export interface TransportMeta {
  vehicles: { id: number; vehicleId: string; registrationNumber: string; status: string }[];
  routes: { id: number; name: string; routeCode: string; status: string; stops: TransportStop[] }[];
  staff: { id: number; name: string; staffId: string; status: string }[];
  students: { id: number; name: string; admissionNo: string; classId: number; class?: { id: number; name: string; section?: string } }[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const transportService = {
  dashboard: async (): Promise<any> => {
    const { data } = await api.get('/transport/dashboard');
    return data;
  },
  meta: async (): Promise<TransportMeta> => {
    const { data } = await api.get('/transport/meta');
    return data;
  },
  vehicles: async (params?: Record<string, any>): Promise<{ vehicles: TransportVehicle[]; pagination: PaginationInfo }> => {
    const { data } = await api.get('/transport/vehicles', { params });
    return data;
  },
  vehicle: async (id: number): Promise<TransportVehicle> => {
    const { data } = await api.get(`/transport/vehicles/${id}`);
    return data;
  },
  createVehicle: async (payload: Record<string, any>) => {
    const { data } = await api.post('/transport/vehicles', payload);
    return data;
  },
  updateVehicle: async (id: number, payload: Record<string, any>) => {
    const { data } = await api.put(`/transport/vehicles/${id}`, payload);
    return data;
  },
  deleteVehicle: async (id: number) => {
    const { data } = await api.delete(`/transport/vehicles/${id}`);
    return data;
  },
  addDocument: async (vehicleId: number, payload: Record<string, any>) => {
    const { data } = await api.post(`/transport/vehicles/${vehicleId}/documents`, payload);
    return data;
  },
  updateDocument: async (docId: number, payload: Record<string, any>) => {
    const { data } = await api.put(`/transport/vehicles/documents/${docId}`, payload);
    return data;
  },
  deleteDocument: async (docId: number) => {
    const { data } = await api.delete(`/transport/vehicles/documents/${docId}`);
    return data;
  },
  staff: async (params?: Record<string, any>): Promise<{ staff: TransportDriver[]; pagination: PaginationInfo }> => {
    const { data } = await api.get('/transport/staff', { params });
    return data;
  },
  createStaff: async (payload: Record<string, any>) => {
    const { data } = await api.post('/transport/staff', payload);
    return data;
  },
  updateStaff: async (id: number, payload: Record<string, any>) => {
    const { data } = await api.put(`/transport/staff/${id}`, payload);
    return data;
  },
  deleteStaff: async (id: number) => {
    const { data } = await api.delete(`/transport/staff/${id}`);
    return data;
  },
  routes: async (params?: Record<string, any>): Promise<{ routes: TransportRoute[]; pagination: PaginationInfo }> => {
    const { data } = await api.get('/transport/routes', { params });
    return data;
  },
  route: async (id: number): Promise<TransportRoute> => {
    const { data } = await api.get(`/transport/routes/${id}`);
    return data;
  },
  createRoute: async (payload: Record<string, any>) => {
    const { data } = await api.post('/transport/routes', payload);
    return data;
  },
  updateRoute: async (id: number, payload: Record<string, any>) => {
    const { data } = await api.put(`/transport/routes/${id}`, payload);
    return data;
  },
  deleteRoute: async (id: number) => {
    const { data } = await api.delete(`/transport/routes/${id}`);
    return data;
  },
  addStop: async (routeId: number, payload: Record<string, any>) => {
    const { data } = await api.post(`/transport/routes/${routeId}/stops`, payload);
    return data;
  },
  updateStop: async (stopId: number, payload: Record<string, any>) => {
    const { data } = await api.put(`/transport/routes/stops/${stopId}`, payload);
    return data;
  },
  deleteStop: async (stopId: number) => {
    const { data } = await api.delete(`/transport/routes/stops/${stopId}`);
    return data;
  },
  reorderStops: async (routeId: number, order: number[]) => {
    const { data } = await api.put(`/transport/routes/${routeId}/stops/reorder`, { order });
    return data;
  },
  assignments: async (params?: Record<string, any>): Promise<{ assignments: TransportAssignment[]; pagination: PaginationInfo }> => {
    const { data } = await api.get('/transport/assignments', { params });
    return data;
  },
  createAssignment: async (payload: Record<string, any>) => {
    const { data } = await api.post('/transport/assignments', payload);
    return data;
  },
  updateAssignment: async (id: number, payload: Record<string, any>) => {
    const { data } = await api.put(`/transport/assignments/${id}`, payload);
    return data;
  },
  deleteAssignment: async (id: number) => {
    const { data } = await api.delete(`/transport/assignments/${id}`);
    return data;
  },
  fees: async (params?: Record<string, any>): Promise<{ fees: TransportFeeRecord[]; summary: { total: number; collected: number; pending: number }; pagination: PaginationInfo }> => {
    const { data } = await api.get('/transport/fees', { params });
    return data;
  },
  createFee: async (payload: Record<string, any>) => {
    const { data } = await api.post('/transport/fees', payload);
    return data;
  },
  updateFee: async (id: number, payload: Record<string, any>) => {
    const { data } = await api.put(`/transport/fees/${id}`, payload);
    return data;
  },
  deleteFee: async (id: number) => {
    const { data } = await api.delete(`/transport/fees/${id}`);
    return data;
  },
  report: async (type: string, params?: Record<string, any>): Promise<any> => {
    const { data } = await api.get('/transport/reports', { params: { type, ...params } });
    return data;
  },
  printReport: async (type: string, params?: Record<string, any>): Promise<Blob> => {
    const { data } = await api.get('/transport/reports/print', { params: { type, ...params }, responseType: 'blob' });
    return data;
  },
};

export const transportStatusStyles: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge',
  maintenance: 'badge-warning',
  retired: 'badge-danger',
  on_leave: 'badge-warning',
  suspended: 'badge-warning',
  expired: 'badge-danger',
  expiring: 'badge-warning',
  valid: 'badge-success',
};

export const transportStatusLabel: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
  retired: 'Retired',
  on_leave: 'On Leave',
  suspended: 'Suspended',
};
