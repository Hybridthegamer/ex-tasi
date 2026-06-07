import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE, withCredentials: false });

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('exetasi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('exetasi_token');
      localStorage.removeItem('exetasi_user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || { message: 'Network error. Please try again.' });
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
};

// ─── Quiz ────────────────────────────────────────────────────────────────────
export const quizAPI = {
  create:       (data)     => api.post('/quiz', data),
  getAll:       ()         => api.get('/quiz'),
  getById:      (id)       => api.get(`/quiz/${id}`),
  update:       (id, data) => api.put(`/quiz/${id}`, data),
  publish:      (id, data) => api.post(`/quiz/${id}/publish`, data),
  close:        (id)       => api.post(`/quiz/${id}/close`),
  delete:       (id)       => api.delete(`/quiz/${id}`),
  validateCode: (code)     => api.get(`/quiz/validate/${code}`),
  getProctoring:(id)       => api.get(`/quiz/${id}/proctoring`),
};

// ─── Submission ──────────────────────────────────────────────────────────────
export const submissionAPI = {
  start:       (quizId)         => api.post('/submission/start', { quizId }),
  saveAnswer:  (id, data)       => api.put(`/submission/${id}/answer`, data),
  submit:      (id, data)       => api.post(`/submission/${id}/submit`, data || {}),
  getResult:   (id)             => api.get(`/submission/${id}/result`),
  getHistory:  ()               => api.get('/submission/my/history'),
  getByQuiz:   (quizId)         => api.get(`/submission/quiz/${quizId}`),
  logProctor:  (id, data)       => api.post(`/submission/${id}/proctor`, data),
  gradeAnswer: (id, data)       => api.put(`/submission/${id}/grade`, data),
};

// ─── Institution ─────────────────────────────────────────────────────────────
export const institutionAPI = {
  get:            () => api.get('/institution'),
  getTutorStats:  () => api.get('/institution/stats/tutor'),
  getStudentStats:() => api.get('/institution/stats/student'),
};

export default api;