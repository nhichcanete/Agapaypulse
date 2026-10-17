import api from '../api/client';

export const patientApi = {
  getAll: (params) => api.get('/patients', { params }),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] !== null) formData.append(key, data[key]);
    });
    return api.post('/patients', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const queueApi = {
  getQueue: (params) => api.get('/queue', { params }),
};

export const medicineApi = {
  getAll: (params) => api.get('/medicines', { params }),
};

export const reservationApi = {
  create: (data) => api.post('/reservations', data),
  getMine: () => api.get('/my-reservations'),
  getOpenClaims: () => api.get('/pharmacy/reservations'),
  completePickup: (queueId) => api.post('/pharmacy/complete-pickup', { queue_id: queueId }),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics'),
};

export default api;