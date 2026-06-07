import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, BookOpen, LayoutDashboard, PlusCircle, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const tutorLinks = [
    { to: '/tutor',          label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tutor/create',   label: 'New Quiz',  icon: PlusCircle },
  ];

  const studentLinks = [
    { to: '/student',        label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/join',   label: 'Join Quiz', icon: BookOpen },
    { to: '/student/history',label: 'History',   icon: History },
  ];

  const links = user?.role === 'tutor' ? tutorLinks : studentLinks;
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-terracotta-100 shadow-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user?.role === 'tutor' ? '/tutor' : '/student'}
            className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-terracotta-500 flex items-center justify-center shadow-warm group-hover:bg-terracotta-600 transition-colors">
              <span className="font-serif text-white text-xl font-bold leading-none">Ε</span>
            </div>
            <span className="font-serif text-xl text-[var(--text)] hidden sm:block">Exétasi</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive(to)
                    ? 'bg-terracotta-50 text-terracotta-600'
                    : 'text-[var(--text-muted)] hover:bg-terracotta-50 hover:text-terracotta-600'
                }`}>
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-[var(--text)] leading-tight">{user?.name}</span>
              <span className="text-xs text-[var(--text-muted)] capitalize">{user?.role} · {user?.institution?.name}</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-xl hover:bg-terracotta-50 transition"
              onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden pb-4 pt-2 border-t border-terracotta-100 animate-fade-in">
            <div className="flex flex-col gap-1 mb-3">
              {links.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    isActive(to)
                      ? 'bg-terracotta-50 text-terracotta-600'
                      : 'text-[var(--text-muted)] hover:bg-terracotta-50'
                  }`}>
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-terracotta-50">
              <p className="text-sm font-bold text-[var(--text)]">{user?.name}</p>
              <p className="text-xs text-[var(--text-muted)] capitalize">{user?.role} · {user?.institution?.name}</p>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}