import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Copy, Check, Eye, X, Edit, Trash2, BarChart2,
  Users, TrendingUp, AlertTriangle, Award,
  ChevronLeft, ExternalLink, Flag, Download, FileText,
  Send, Mail, CheckCircle, Lock
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { quizAPI, submissionAPI } from '../../services/api';

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
  const [copied, setCopied]           = useState(false);
  const [closing, setClosing]         = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [confirm, setConfirm]         = useState(null);
  const [showRelease, setShowRelease] = useState(false);
  const [releasing, setReleasing]     = useState(false);
  const [sendEmail, setSendEmail]     = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState('');

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

  const handleReleaseResults = async () => {
    setReleasing(true);
    try {
      const res = await submissionAPI.releaseResults(id, { sendEmail });
      setShowRelease(false);
      const msg = sendEmail && res.emailsSent > 0
        ? `Results released! ${res.emailsSent} student${res.emailsSent !== 1 ? 's' : ''} emailed.`
        : 'Results released! Students can now view their scores.';
      setReleaseSuccess(msg);
      setTimeout(() => setReleaseSuccess(''), 6000);
      load(); // refresh quiz data so releasedAt is shown
    } catch (err) {
      setError(err?.message || 'Failed to release results.');
    } finally {
      setReleasing(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Student Name', 'Email', 'Score', 'Max Score', 'Percentage', 'Status', 'Pass/Fail', 'Flagged', 'Tab Switches', 'Submitted At'];
    const rows = submissions.map(sub => [
      sub.student?.name || '',
      sub.student?.email || '',
      sub.totalScore ?? '',
      sub.maxPossibleScore ?? '',
      sub.percentage != null ? `${sub.percentage}%` : '',
      sub.status || '',
      sub.passed ? 'Pass' : 'Fail',
      sub.flagged ? 'Yes' : 'No',
      sub.tabSwitches ?? 0,
      sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('en-GB') : ''
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${quiz.title.replace(/\s+/g, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    const rows = submissions.map(sub => `
      <tr>
        <td>${sub.student?.name || '—'}</td>
        <td>${sub.student?.email || '—'}</td>
        <td>${sub.totalScore ?? '—'}/${sub.maxPossibleScore ?? '—'}</td>
        <td><strong>${sub.percentage ?? '—'}%</strong></td>
        <td style="color:${sub.passed ? '#16a34a' : '#dc2626'}">${sub.passed ? 'Pass' : 'Fail'}</td>
        <td>${sub.status || '—'}</td>
        <td>${sub.flagged ? '⚑ Yes' : 'No'}</td>
        <td>${sub.tabSwitches ?? 0}</td>
        <td>${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('en-GB') : '—'}</td>
      </tr>`).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${quiz.title} – Results</title>
      <style>
        body { font-family: Georgia, serif; margin: 24px; color: #1a1a1a; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        p.meta { font-size: 12px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f5ede6; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 7px 10px; border-bottom: 1px solid #f0e4d9; }
        tr:hover td { background: #fdf7f4; }
        .footer { margin-top: 24px; font-size: 11px; color: #999; }
      </style></head><body>
      <h1>${quiz.title} — Student Results</h1>
      <p class="meta">
        Total Questions: ${quiz.questions?.length ?? 0} &nbsp;·&nbsp;
        Max Points: ${quiz.totalPoints} &nbsp;·&nbsp;
        Pass Mark: ${quiz.passingScore}% &nbsp;·&nbsp;
        Submissions: ${submissions.length} &nbsp;·&nbsp;
        Exported: ${new Date().toLocaleString('en-GB')}
      </p>
      <table>
        <thead><tr>
          <th>Student</th><th>Email</th><th>Score</th><th>%</th>
          <th>Pass/Fail</th><th>Status</th><th>Flagged</th><th>Tab Switches</th><th>Submitted At</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="footer">Generated by Exétasi · ${new Date().toLocaleString('en-GB')}</p>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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

        {/* Success toast for result release */}
        {releaseSuccess && (
          <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 animate-fade-in">
            <CheckCircle size={18} className="text-green-500 shrink-0" />
            <p className="text-sm font-semibold text-green-700">{releaseSuccess}</p>
          </div>
        )}

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
                <span>·</span>
                {quiz.showResultsImmediately === false
                  ? quiz.resultsReleasedAt
                    ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Results released {fmt(quiz.resultsReleasedAt)}</span>
                    : <span className="text-violet-600 flex items-center gap-1"><Lock size={10} /> Results not yet released</span>
                  : <span className="text-green-600">Results visible immediately</span>}
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
              {/* Release Results — only show when showResultsImmediately is off and there are submissions */}
              {quiz.showResultsImmediately === false && submissions.length > 0 && (
                <button onClick={() => setShowRelease(true)}
                  className={`text-sm flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold border transition-all ${
                    quiz.resultsReleasedAt
                      ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}>
                  {quiz.resultsReleasedAt
                    ? <><CheckCircle size={14} /> Results Released</>
                    : <><Send size={14} /> Release Results</>}
                </button>
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-terracotta-50 flex-wrap gap-3">
            <h2 className="font-serif text-lg text-[var(--text)]">Submissions ({submissions.length})</h2>
            {submissions.length > 0 && (
              <div className="flex items-center gap-2">
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-xl transition-colors">
                  <Download size={13} /> Export CSV
                </button>
                <button onClick={exportPDF}
                  className="flex items-center gap-1.5 text-xs font-bold text-terracotta-700 bg-terracotta-50 hover:bg-terracotta-100 border border-terracotta-200 px-3 py-1.5 rounded-xl transition-colors">
                  <FileText size={13} /> Export PDF
                </button>
              </div>
            )}
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

        {/* Release Results modal */}
        {showRelease && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-warm-lg p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                  <Send size={18} className="text-violet-600" />
                </div>
                <h3 className="font-serif text-xl text-[var(--text)]">
                  {quiz.resultsReleasedAt ? 'Re-release Results?' : 'Release Results?'}
                </h3>
              </div>

              <p className="text-sm text-[var(--text-muted)] mb-5">
                {quiz.resultsReleasedAt
                  ? `Results were previously released. You can send emails again to all ${submissions.length} student${submissions.length !== 1 ? 's' : ''}.`
                  : `This will make scores and feedback visible to all ${submissions.length} student${submissions.length !== 1 ? 's' : ''} who submitted this quiz.`}
              </p>

              {/* Email option */}
              <label className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 mb-5 cursor-pointer hover:bg-violet-100 transition-colors">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-violet-600 w-4 h-4 shrink-0"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <div>
                  <p className="text-sm font-bold text-violet-800 flex items-center gap-1.5">
                    <Mail size={13} /> Also email students their results
                  </p>
                  <p className="text-xs text-violet-600 mt-0.5">
                    Each student will receive a result summary with a link to view their full breakdown.
                    Requires email to be configured on the server.
                  </p>
                </div>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setShowRelease(false)} className="btn-outline flex-1 text-sm">Cancel</button>
                <button onClick={handleReleaseResults}
                  disabled={releasing}
                  className="flex-1 text-sm font-bold py-3 rounded-2xl text-white bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {releasing
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Releasing…</>
                    : <><Send size={14} /> Release</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}