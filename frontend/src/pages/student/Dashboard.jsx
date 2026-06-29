import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen, CheckCircle, TrendingUp, Award,
  Clock, ChevronRight, Plus, BarChart2, Calendar, Lock
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { submissionAPI, institutionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

const pctColor = (pct) =>
  pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

const pctBg = (pct) =>
  pct >= 70 ? 'bg-green-50 border-green-100' : pct >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

export default function StudentDashboard() {
  const { user }                      = useAuth();
  const location                      = useLocation();
  const isHistory                     = location.pathname === '/student/history';
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([submissionAPI.getHistory(), institutionAPI.getStudentStats()])
      .then(([subs, st]) => { setSubmissions(subs); setStats(st); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const display = isHistory ? submissions : submissions.slice(0, 5);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[var(--text)]">
              {isHistory ? 'Quiz History' : `Hello, ${user?.name?.split(' ')[0]} 👋`}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {isHistory ? 'All your completed quizzes' : `${user?.institution?.name} · Student`}
            </p>
          </div>
          <Link to="/student/join" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Join Quiz
          </Link>
        </div>

        {/* Stats */}
        {!isHistory && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Quizzes Taken', value: stats?.quizzesTaken ?? '—', icon: BookOpen,    color: 'bg-violet-50 text-violet-600' },
              { label: 'Passed',        value: stats?.passed       ?? '—', icon: CheckCircle, color: 'bg-green-50 text-green-600' },
              { label: 'Avg Score',     value: stats ? `${stats.avgScore}%`  : '—', icon: TrendingUp, color: 'bg-terracotta-50 text-terracotta-600' },
              { label: 'Best Score',    value: stats ? `${stats.bestScore}%` : '—', icon: Award,      color: 'bg-amber-50 text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon size={18} />
                </div>
                {loading
                  ? <div className="skeleton h-7 w-12 mb-1" />
                  : <p className="font-serif text-2xl text-[var(--text)]">{value}</p>
                }
                <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isHistory && !loading && submissions.length === 0 && (
          <div className="card border-dashed border-2 border-terracotta-200 text-center py-12 mb-8">
            <div className="w-14 h-14 rounded-full bg-terracotta-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-terracotta-400" />
            </div>
            <h2 className="font-serif text-xl text-[var(--text)] mb-2">No quizzes yet</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Enter a 6-character code from your tutor to get started.
            </p>
            <Link to="/student/join" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Join your first quiz
            </Link>
          </div>
        )}

        {/* Submissions list */}
        {(loading || display.length > 0) && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-terracotta-50">
              <h2 className="font-serif text-lg text-[var(--text)]">
                {isHistory ? `All Results (${submissions.length})` : 'Recent Activity'}
              </h2>
              {!isHistory && submissions.length > 5 && (
                <Link to="/student/history" className="text-sm text-terracotta-500 font-bold hover:underline flex items-center gap-1">
                  View all <ChevronRight size={14} />
                </Link>
              )}
            </div>

            {loading ? (
              <div className="divide-y divide-terracotta-50">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-48" />
                      <div className="skeleton h-3 w-32" />
                    </div>
                    <div className="skeleton h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-terracotta-50">
                {display.map((sub) => {
                  const released = sub.resultsReleased !== false;
                  return (
                    <Link key={sub._id} to={`/student/result/${sub._id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-terracotta-50 transition-colors group">
                      {released ? (
                        <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 ${pctBg(sub.percentage ?? 0)}`}>
                          <span className={`text-sm font-extrabold leading-none ${pctColor(sub.percentage ?? 0)}`}>{sub.percentage ?? '—'}</span>
                          <span className={`text-xs font-bold leading-none ${pctColor(sub.percentage ?? 0)}`}>%</span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center shrink-0">
                          <Lock size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text)] truncate">{sub.quiz?.title || 'Untitled Quiz'}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Calendar size={11} /> {fmt(sub.submittedAt)}
                          </span>
                          {released && sub.totalScore != null && (
                            <span className="text-xs text-[var(--text-muted)]">
                              {sub.totalScore}/{sub.maxPossibleScore} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {released ? (
                          sub.passed
                            ? <span className="badge-passed">Passed</span>
                            : <span className="badge-failed">Failed</span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-500 text-xs">Pending</span>
                        )}
                        {sub.flagged && <span className="badge-flagged">Flagged</span>}
                        <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-terracotta-500 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty history */}
        {isHistory && !loading && submissions.length === 0 && (
          <div className="card text-center py-12">
            <BarChart2 size={36} className="text-terracotta-200 mx-auto mb-4" />
            <h2 className="font-serif text-xl text-[var(--text)] mb-2">No history yet</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">Complete a quiz to see your results here.</p>
            <Link to="/student/join" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> Join a Quiz
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}