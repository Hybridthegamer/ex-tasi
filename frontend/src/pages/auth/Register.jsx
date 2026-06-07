import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, AlertCircle, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: '', institutionName: ''
  });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate     = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.role) { setError('Please select your role.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === 'tutor' ? '/tutor' : '/student', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-terracotta-500 flex items-center justify-center shadow-warm group-hover:bg-terracotta-600 transition-colors">
              <span className="font-serif text-white text-2xl font-bold leading-none">Ε</span>
            </div>
            <span className="font-serif text-3xl text-[var(--text)]">Exétasi</span>
          </Link>
          <h1 className="font-serif text-2xl text-[var(--text)] mt-6 mb-1">Create your account</h1>
          <p className="text-sm text-[var(--text-muted)]">Join your institution on Exétasi</p>
        </div>

        <div className="card">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-xl mb-5">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="label">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'tutor',   label: 'Tutor',   sub: 'Create & manage quizzes',   icon: GraduationCap },
                  { value: 'student', label: 'Student', sub: 'Take quizzes & see results', icon: BookOpen },
                ].map(({ value, label, sub, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, role: value })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all ${
                      form.role === value
                        ? 'border-terracotta-500 bg-terracotta-50'
                        : 'border-terracotta-100 hover:border-terracotta-200'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      form.role === value ? 'bg-terracotta-500 text-white' : 'bg-terracotta-50 text-terracotta-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${form.role === value ? 'text-terracotta-700' : 'text-[var(--text)]'}`}>
                        {label}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] leading-tight">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Full name</label>
              <input type="text" name="name" required autoComplete="name"
                className="input" placeholder="Your full name"
                value={form.name} onChange={handle} />
            </div>

            <div>
              <label className="label">Email address</label>
              <input type="email" name="email" required autoComplete="email"
                className="input" placeholder="you@example.com"
                value={form.email} onChange={handle} />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password" required autoComplete="new-password"
                  className="input pr-11" placeholder="Min. 6 characters"
                  value={form.password} onChange={handle} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-terracotta-500 transition">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Institution / Organisation name</label>
              <input type="text" name="institutionName" required
                className="input" placeholder="e.g. Rivers State University"
                value={form.institutionName} onChange={handle} />
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Tutors and students with the same institution name are automatically linked.
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="greek-border my-6" />

          <p className="text-center text-sm text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="text-terracotta-500 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          © {new Date().getFullYear()} Exétasi. All rights reserved.
        </p>
      </div>
    </div>
  );
}