import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — log outgoing
api.interceptors.request.use((config) => {
  console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Unknown error';
    return Promise.reject(new Error(message));
  }
);

// ---- Chat ----
export const sendChat = async (query, sessionId = null) => {
  const { data } = await api.post('/chat', { query, session_id: sessionId });
  return data;
};

// ---- Upload ----
export const uploadDocument = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return data;
};

// ---- Health ----
export const getHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};

// ---- Metrics ----
export const getMetrics = async () => {
  const { data } = await api.get('/metrics');
  return data;
};

export default api;
