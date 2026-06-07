import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function RoleRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === 'tutor' ? '/tutor' : '/student'} replace />;
  }
  return children;
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-terracotta-100 flex items-center justify-center animate-pulse">
          <span className="font-serif text-3xl text-terracotta-500">Ε</span>
        </div>
        <p className="text-[var(--text-muted)] font-semibold">Loading Exétasi…</p>
      </div>
    </div>
  );
}