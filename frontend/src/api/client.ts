import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Investments
export const investmentsAPI = {
  list: (params?: Record<string, string>) => api.get('/investments', { params }),
  get: (id: string) => api.get(`/investments/${id}`),
  create: (data: any) => api.post('/investments', data),
  update: (id: string, data: any) => api.put(`/investments/${id}`, data),
  delete: (id: string) => api.delete(`/investments/${id}`),
  extend: (id: string, data: any) => api.post(`/investments/${id}/extend`, data),
  markPaymentInitiated: (id: string) => api.post(`/investments/${id}/mark-payment-initiated`),
  markPaymentCompleted: (id: string) => api.post(`/investments/${id}/mark-payment-completed`),
  dashboard: () => api.get('/investments/dashboard'),
  export: (params?: Record<string, string>) =>
    api.get('/investments/export', { params, responseType: 'blob' }),
};

// Users
export const usersAPI = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Audit Logs
export const auditLogsAPI = {
  list: (params?: Record<string, string>) => api.get('/audit-logs', { params }),
  export: (params?: Record<string, string>) =>
    api.get('/audit-logs/export', { params, responseType: 'blob' }),
};

// AI Upload
export const aiUploadAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/ai-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (settings: Record<string, string>) => api.put('/settings', { settings }),
};

// Bulk / duplicates
export const bulkAPI = {
  create: (investments: any[]) => api.post('/investments/bulk', { investments }),
  duplicates: () => api.get('/investments/duplicates'),
};

// Applications (public + admin)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 30000,
});

export const applicationsAPI = {
  submit: (data: any) => publicApi.post('/applications', data),
  getStatus: (id: string) => publicApi.get(`/applications/${id}/status`),
  resubmit: (id: string, data: any) => publicApi.put(`/applications/${id}/resubmit`, data),
  list: (params?: Record<string, string>) => api.get('/applications', { params }),
  get: (id: string) => api.get(`/applications/${id}`),
  reject: (id: string, reason: string) => api.post(`/applications/${id}/reject`, { reason }),
  approve: (id: string, data: any) => api.post(`/applications/${id}/approve`, data),
};
