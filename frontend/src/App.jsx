import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';

// Public pages
import Landing  from './pages/Landing';
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Tutor pages
import TutorDashboard from './pages/tutor/Dashboard';
import CreateQuiz     from './pages/tutor/CreateQuiz';
import QuizDetails    from './pages/tutor/QuizDetails';
import LiveMonitor    from './pages/tutor/LiveMonitor';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import JoinQuiz         from './pages/student/JoinQuiz';
import TakeQuiz         from './pages/student/TakeQuiz';
import Results          from './pages/student/Results';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={user ? <Navigate to={user.role === 'tutor' ? '/tutor' : '/student'} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'tutor' ? '/tutor' : '/student'} replace /> : <Register />} />

      {/* ── Tutor ──────────────────────────────────────────────────────── */}
      <Route path="/tutor" element={
        <RoleRoute role="tutor"><TutorDashboard /></RoleRoute>
      } />
      <Route path="/tutor/create" element={
        <RoleRoute role="tutor"><CreateQuiz /></RoleRoute>
      } />
      <Route path="/tutor/quiz/:id" element={
        <RoleRoute role="tutor"><QuizDetails /></RoleRoute>
      } />
      <Route path="/tutor/quiz/:id/edit" element={
        <RoleRoute role="tutor"><CreateQuiz /></RoleRoute>
      } />
      <Route path="/tutor/quiz/:id/monitor" element={
        <RoleRoute role="tutor"><LiveMonitor /></RoleRoute>
      } />

      {/* ── Student ────────────────────────────────────────────────────── */}
      <Route path="/student" element={
        <RoleRoute role="student"><StudentDashboard /></RoleRoute>
      } />
      <Route path="/student/join" element={
        <RoleRoute role="student"><JoinQuiz /></RoleRoute>
      } />
      <Route path="/student/join/:code" element={
        <RoleRoute role="student"><JoinQuiz /></RoleRoute>
      } />
      <Route path="/student/quiz/:submissionId" element={
        <RoleRoute role="student"><TakeQuiz /></RoleRoute>
      } />
      <Route path="/student/result/:submissionId" element={
        <RoleRoute role="student"><Results /></RoleRoute>
      } />
      <Route path="/student/history" element={
        <RoleRoute role="student"><StudentDashboard /></RoleRoute>
      } />

      {/* ── Fallback ───────────────────────────────────────────────────── */}
      <Route path="*" element={
        user
          ? <Navigate to={user.role === 'tutor' ? '/tutor' : '/student'} replace />
          : <Navigate to="/" replace />
      } />
    </Routes>
  );
}