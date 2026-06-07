import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle, BookOpen, Users, BarChart2, AlertTriangle,
  ChevronRight, Clock, Eye, Copy, Check, TrendingUp, FileText
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { quizAPI, institutionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

export default function TutorDashboard() {
  const { user }              = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(null);

  useEffect(() => {
    Promise.all([quizAPI.getAll(), institutionAPI.getTutorStats()])
      .then(([q, s]) => { setQuizzes(q); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (e, code) => {
    e.preventDefault();
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const statCards = [
    { label: 'Total Quizzes', value: stats?.quizCount       ?? '—', icon: BookOpen,      color: 'bg-violet-50 text-violet-600' },
    { label: 'Active',        value: stats?.activeQuizzes   ?? '—', icon: TrendingUp,    color: 'bg-green-50 text-green-600' },
    { label: 'Submissions',   value: stats?.submissionCount ?? '—', icon: Users,         color: 'bg-terracotta-50 text-terracotta-600' },
    { label: 'Avg Score',     value: stats ? `${stats.avgScore}%`  : '—', icon: BarChart2, color: 'bg-amber-50 text-amber-600' },
    { label: 'Pass Rate',     value: stats ? `${stats.passRate}%`  : '—', icon: Check,   color: 'bg-blue-50 text-blue-600' },
    { label: 'Flagged',       value: stats?.flaggedCount    ?? '—', icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[var(--text)]">
              Hello, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {user?.institution?.name} · Tutor
            </p>
          </div>
          <Link to="/tutor/create" className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle size={16} /> New Quiz
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${color}`}>
                <Icon size={16} />
              </div>
              {loading
                ? <div className="skeleton h-7 w-10 mb-1" />
                : <p className="font-serif text-2xl text-[var(--text)]">{value}</p>
              }
              <p className="text-xs text-[var(--text-muted)] font-semibold leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Quiz list */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-terracotta-50">
            <h2 className="font-serif text-lg text-[var(--text)]">
              Your Quizzes {!loading && `(${quizzes.length})`}
            </h2>
            <Link to="/tutor/create" className="btn-ghost text-sm flex items-center gap-1.5">
              <PlusCircle size={15} /> Create
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-terracotta-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-6 py-5 flex items-center gap-4">
                  <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-56" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 rounded-full bg-terracotta-50 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-terracotta-300" />
              </div>
              <h3 className="font-serif text-xl text-[var(--text)] mb-2">No quizzes yet</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Create your first quiz and share the code with your students.
              </p>
              <Link to="/tutor/create" className="btn-primary inline-flex items-center gap-2">
                <PlusCircle size={16} /> Create your first quiz
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-terracotta-50">
              {quizzes.map((quiz) => (
                <Link key={quiz._id} to={`/tutor/quiz/${quiz._id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-terracotta-50 transition-colors group">

                  <div className="w-10 h-10 rounded-xl bg-terracotta-100 flex items-center justify-center shrink-0">
                    <BookOpen size={18} className="text-terracotta-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[var(--text)] truncate">{quiz.title}</p>
                      <span className={`badge-${quiz.status}`}>{quiz.status}</span>
                      {quiz.isLive && (
                        <span className="badge bg-red-100 text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-[var(--text-muted)]">
                        {quiz.questionCount ?? quiz.questions?.length ?? 0} questions
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {quiz.submissionCount ?? 0} submissions
                      </span>
                      {quiz.avgScore > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">Avg: {quiz.avgScore}%</span>
                      )}
                      {quiz.deadline && (
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Clock size={10} /> Due {fmt(quiz.deadline)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {quiz.accessCode && (
                      <button onClick={(e) => copyCode(e, quiz.accessCode)}
                        className="flex items-center gap-1.5 bg-terracotta-50 hover:bg-terracotta-100 border border-terracotta-200 text-terracotta-700 text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                        {copied === quiz.accessCode ? <Check size={11} /> : <Copy size={11} />}
                        {quiz.accessCode}
                      </button>
                    )}
                    {quiz.isLive && quiz.status === 'active' && (
                      <Link to={`/tutor/quiz/${quiz._id}/monitor`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors border border-red-100">
                        <Eye size={11} /> Monitor
                      </Link>
                    )}
                    <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-terracotta-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}