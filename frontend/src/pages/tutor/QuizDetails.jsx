import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Copy, Check, Eye, X, Edit, Trash2, BarChart2,
  Users, TrendingUp, AlertTriangle, Award,
  ChevronLeft, ExternalLink, Flag
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { quizAPI } from '../../services/api';

const fmt = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const pctColor = (pct) =>
  pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

export default function QuizDetails() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [closing, setClosing]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm]   = useState(null);

  const load = () => {
    setLoading(true);
    quizAPI.getById(id)
      .then(setData)
      .catch(() => setError('Failed to load quiz.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const copyCode = () => {
    navigator.clipboard.writeText(data.quiz.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeQuiz = async () => {
    setClosing(true);
    try { await quizAPI.close(id); setConfirm(null); load(); }
    catch { setError('Failed to close quiz.'); }
    finally { setClosing(false); }
  };

  const deleteQuiz = async () => {
    setDeleting(true);
    try { await quizAPI.delete(id); navigate('/tutor'); }
    catch { setError('Failed to delete quiz.'); setDeleting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-cream"><Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-36 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </main>
    </div>
  );

  if (error && !data) return (
    <div className="min-h-screen bg-cream"><Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="card text-center py-12">
          <p className="text-red-600 font-semibold">{error}</p>
          <button onClick={() => navigate('/tutor')} className="btn-outline mt-4">← Back</button>
        </div>
      </main>
    </div>
  );

  const { quiz, submissions = [], stats = {} } = data || {};

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">

        <button onClick={() => navigate('/tutor')}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-terracotta-500 font-semibold mb-5 transition-colors">
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        {/* Header */}
        <div className="card mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="font-serif text-2xl text-[var(--text)]">{quiz.title}</h1>
                <span className={`badge-${quiz.status}`}>{quiz.status}</span>
                {quiz.isLive && (
                  <span className="badge bg-red-100 text-red-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                  </span>
                )}
              </div>
              {quiz.description && <p className="text-sm text-[var(--text-muted)] mb-3">{quiz.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)] font-semibold">
                <span>{quiz.questions?.length ?? 0} questions</span>
                <span>·</span><span>{quiz.totalPoints} pts</span>
                <span>·</span><span>Pass: {quiz.passingScore}%</span>
                {quiz.duration && <><span>·</span><span>{quiz.duration} min/student</span></>}
                {quiz.deadline && <><span>·</span><span>Due: {fmt(quiz.deadline)}</span></>}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {(quiz.status === 'draft' || (quiz.status === 'active' && submissions.length === 0)) && (
                <Link to={`/tutor/quiz/${id}/edit`} className="btn-outline text-sm flex items-center gap-1.5">
                  <Edit size={14} /> Edit
                </Link>
              )}
              {quiz.isLive && quiz.status === 'active' && (
                <Link to={`/tutor/quiz/${id}/monitor`} className="btn-secondary text-sm flex items-center gap-1.5">
                  <Eye size={14} /> Monitor
                </Link>
              )}
              {quiz.status === 'active' && (
                <button onClick={() => setConfirm('close')}
                  className="btn-outline text-sm text-amber-600 border-amber-300 hover:bg-amber-50 flex items-center gap-1.5">
                  <X size={14} /> Close
                </button>
              )}
              <button onClick={() => setConfirm('delete')}
                className="btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          {quiz.accessCode && (
            <div className="mt-4 pt-4 border-t border-terracotta-50 flex items-center gap-3 flex-wrap">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Access Code</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-extrabold tracking-[0.2em] text-terracotta-600 bg-terracotta-50 px-3 py-1.5 rounded-xl border border-terracotta-200">
                  {quiz.accessCode}
                </span>
                <button onClick={copyCode}
                  className="flex items-center gap-1.5 text-xs font-bold text-terracotta-600 bg-terracotta-50 hover:bg-terracotta-100 border border-terracotta-200 px-3 py-1.5 rounded-xl transition-colors">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {submissions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Submissions', value: submissions.length, icon: Users, color: 'bg-violet-50 text-violet-600' },
              { label: 'Avg Score', value: stats.avgPercentage ? `${Number(stats.avgPercentage).toFixed(1)}%` : '—', icon: TrendingUp, color: 'bg-terracotta-50 text-terracotta-600' },
              { label: 'Passed', value: stats.passCount ?? 0, icon: Award, color: 'bg-green-50 text-green-600' },
              { label: 'Flagged', value: submissions.filter(s => s.flagged).length, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                  <Icon size={16} />
                </div>
                <p className="font-serif text-2xl text-[var(--text)]">{value}</p>
                <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Submissions */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-terracotta-50">
            <h2 className="font-serif text-lg text-[var(--text)]">Submissions ({submissions.length})</h2>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <BarChart2 size={32} className="text-terracotta-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[var(--text-muted)]">No submissions yet</p>
              {quiz.status === 'active' && quiz.accessCode && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Share code <strong className="text-terracotta-600 font-mono">{quiz.accessCode}</strong> with your students
                </p>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-terracotta-50 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Student</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Score</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Submitted</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Flags</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terracotta-50">
                  {submissions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-terracotta-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-bold text-[var(--text)]">{sub.student?.name || '—'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{sub.student?.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-extrabold ${pctColor(sub.percentage)}`}>{sub.percentage}%</span>
                        <span className="text-xs text-[var(--text-muted)] ml-1">({sub.totalScore}/{sub.maxPossibleScore})</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          {sub.passed ? <span className="badge-passed">Passed</span> : <span className="badge-failed">Failed</span>}
                          {sub.status === 'auto_submitted' && <span className="badge bg-amber-100 text-amber-700">Auto-submitted</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text-muted)]">{fmt(sub.submittedAt)}</td>
                      <td className="px-4 py-3.5">
                        {sub.flagged && (
                          <div className="flex items-center gap-1 text-red-600">
                            <Flag size={12} />
                            <span className="text-xs font-bold">Flagged</span>
                          </div>
                        )}
                        {sub.tabSwitches > 0 && (
                          <p className="text-xs text-[var(--text-muted)]">{sub.tabSwitches} tab switch{sub.tabSwitches !== 1 ? 'es' : ''}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link to={`/student/result/${sub._id}`} target="_blank"
                          className="flex items-center gap-1 text-xs font-bold text-terracotta-500 hover:underline">
                          <ExternalLink size={12} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confirm modal */}
        {confirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-warm-lg p-6 w-full max-w-sm">
              <h3 className="font-serif text-xl text-[var(--text)] mb-3">
                {confirm === 'close' ? 'Close Quiz?' : 'Delete Quiz?'}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                {confirm === 'close'
                  ? 'Closing will expire the access code. Students who have not started can no longer join.'
                  : 'This will permanently delete the quiz and all student submissions. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirm(null)} className="btn-outline flex-1 text-sm">Cancel</button>
                <button onClick={confirm === 'close' ? closeQuiz : deleteQuiz}
                  disabled={closing || deleting}
                  className="flex-1 text-sm font-bold py-3 rounded-2xl text-white bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {(closing || deleting) && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {confirm === 'close' ? 'Close Quiz' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}