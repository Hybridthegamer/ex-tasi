import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, Award, AlertTriangle,
  ChevronLeft, BookOpen, HelpCircle, ChevronDown, ChevronUp, Home
} from 'lucide-react';
import { submissionAPI } from '../../services/api';
import Navbar from '../../components/Navbar';

const fmt = (iso) => iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const fmtDuration = (start, end) => {
  if (!start || !end) return null;
  const ms  = new Date(end) - new Date(start);
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
};

function ScoreCircle({ percentage, passed }) {
  const r  = 52;
  const c  = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = c - (pct / 100) * c;
  const color = passed ? '#2D8A4E' : percentage >= 40 ? '#D97706' : '#C0392B';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="-rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#F0D9CA" strokeWidth="10" />
        <circle cx="72" cy="72" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl font-bold text-[var(--text)]">{percentage}%</span>
        <span className="text-xs font-bold" style={{ color }}>{passed ? 'Passed' : 'Failed'}</span>
      </div>
    </div>
  );
}

function AnswerCard({ item, index }) {
  const [open, setOpen] = useState(false);
  const { questionText, questionType, media, mediaType, options,
    yourAnswer, correctAnswer, explanation, score, maxScore,
    isCorrect, isGraded, tutorFeedback } = item;

  const displayAnswer = (ans) => {
    if (ans === null || ans === undefined || ans === '') return <em className="text-[var(--text-muted)]">No answer</em>;
    if (Array.isArray(ans)) return ans.join(', ') || <em className="text-[var(--text-muted)]">No answer</em>;
    if (typeof ans === 'string' && ans.startsWith('http')) return (
      <a href={ans} target="_blank" rel="noopener noreferrer"
        className="text-terracotta-500 font-semibold hover:underline text-sm">View uploaded file ↗</a>
    );
    return String(ans);
  };

  const statusIcon = !isGraded
    ? <HelpCircle size={18} className="text-amber-500" />
    : isCorrect ? <CheckCircle size={18} className="text-green-500" />
    : <XCircle size={18} className="text-red-500" />;

  const cardBorder = !isGraded ? 'border-amber-100' : isCorrect ? 'border-green-100' : 'border-red-100';
  const headerBg   = !isGraded ? 'bg-amber-50'    : isCorrect ? 'bg-green-50'    : 'bg-red-50';

  return (
    <div className={`bg-white rounded-3xl border overflow-hidden shadow-card ${cardBorder}`}>
      <button onClick={() => setOpen(o => !o)}
        className={`w-full text-left flex items-center gap-3 px-5 py-4 ${headerBg} transition-colors hover:opacity-90`}>
        <span className="w-7 h-7 rounded-full bg-white/70 flex items-center justify-center text-xs font-bold text-[var(--text)] shrink-0">
          {index + 1}
        </span>
        {statusIcon}
        <p className="flex-1 text-sm font-semibold text-[var(--text)] truncate pr-2">{questionText}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-extrabold ${isGraded ? (isCorrect ? 'text-green-700' : 'text-red-700') : 'text-amber-700'}`}>
            {score}/{maxScore} pts
          </span>
          {open ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
        </div>
      </button>

      {open && (
        <div className="px-5 py-4 space-y-4 animate-fade-in">
          {media && (
            <div className="rounded-xl overflow-hidden border border-terracotta-100">
              {mediaType === 'image' && <img src={media} alt="" className="max-h-48 w-full object-cover" />}
              {mediaType === 'video' && <video src={media} controls className="w-full max-h-48" />}
              {mediaType === 'audio' && <audio src={media} controls className="w-full p-2" />}
            </div>
          )}

          {questionType === 'multiple_choice' && options?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Options</p>
              {options.map((opt, i) => {
                const isYours = Array.isArray(yourAnswer) ? yourAnswer.includes(opt) : yourAnswer === opt;
                const isRight = correctAnswer !== null && correctAnswer !== undefined
                  ? (Array.isArray(correctAnswer) ? correctAnswer.includes(opt) : correctAnswer === opt)
                  : false;
                return (
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold border ${
                    isRight && isYours ? 'bg-green-50 border-green-300 text-green-800'
                    : isRight          ? 'bg-green-50 border-green-200 text-green-700'
                    : isYours          ? 'bg-red-50 border-red-200 text-red-700'
                    :                    'bg-gray-50 border-gray-100 text-[var(--text-muted)]'
                  }`}>
                    {isRight
                      ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                      : isYours ? <XCircle size={14} className="text-red-400 shrink-0" />
                      : <span className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />}
                    {opt}
                    {isYours && !isRight && <span className="ml-auto text-xs text-red-500">Your answer</span>}
                    {isRight && <span className="ml-auto text-xs text-green-600">{isYours ? 'Correct ✓' : 'Correct answer'}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {questionType !== 'multiple_choice' && (
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Your Answer</p>
              <div className={`px-4 py-3 rounded-xl text-sm border ${
                !isGraded ? 'bg-amber-50 border-amber-100 text-[var(--text)]'
                : isCorrect ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {displayAnswer(yourAnswer)}
              </div>
            </div>
          )}

          {correctAnswer !== null && correctAnswer !== undefined && questionType !== 'multiple_choice' && (
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Correct Answer</p>
              <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 font-semibold">
                {displayAnswer(correctAnswer)}
              </div>
            </div>
          )}

          {!isGraded && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <HelpCircle size={14} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-semibold">This answer requires manual grading by your tutor.</p>
            </div>
          )}

          {tutorFeedback && (
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Tutor Feedback</p>
              <div className="px-4 py-3 rounded-xl bg-violet-50 border border-violet-100 text-sm text-violet-800">{tutorFeedback}</div>
            </div>
          )}

          {explanation && (
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">Explanation</p>
              <div className="px-4 py-3 rounded-xl bg-terracotta-50 border border-terracotta-100 text-sm text-[var(--text)]">{explanation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const { submissionId } = useParams();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [results, setResults]               = useState(location.state?.results || null);
  const [loading, setLoading]               = useState(!location.state?.results);
  const [error, setError]                   = useState('');
  const [resultsNotYetReleased, setNotYet]  = useState(false);
  const [pendingQuizTitle, setPendingTitle] = useState('');

  useEffect(() => {
    if (results) return;
    submissionAPI.getResult(submissionId)
      .then((data) => {
        if (data?.resultsNotYetReleased) {
          setNotYet(true);
          setPendingTitle(data.quizTitle || '');
          setResults(null);
        } else {
          setResults(data);
        }
      })
      .catch(() => setError('Could not load results.'))
      .finally(() => setLoading(false));
  }, [submissionId, results]);

  if (loading) return (
    <div className="min-h-screen bg-cream"><Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-terracotta-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="font-serif text-terracotta-500 text-xl">Ε</span>
        </div>
        <p className="text-[var(--text-muted)] font-semibold">Loading your results…</p>
      </main>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-cream"><Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="card text-center py-12">
          <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button onClick={() => navigate('/student')} className="btn-outline">← Dashboard</button>
        </div>
      </main>
    </div>
  );

  if (!results) return (
    <div className="min-h-screen bg-cream"><Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="card text-center py-14">
          <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-violet-400" />
          </div>
          <h2 className="font-serif text-2xl text-[var(--text)] mb-2">
            {resultsNotYetReleased ? 'Results Not Yet Released' : 'Quiz Submitted!'}
          </h2>
          {pendingQuizTitle && (
            <p className="text-xs font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
              {pendingQuizTitle}
            </p>
          )}
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs mx-auto">
            {resultsNotYetReleased
              ? 'Your tutor has not released the results for this quiz yet. You will be able to view your score and feedback once they do.'
              : 'Your quiz has been submitted. Your tutor will release results when they are ready.'}
          </p>
          <Link to="/student" className="btn-primary inline-flex items-center gap-2">
            <Home size={16} /> Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );

  const { quizTitle, totalScore, maxPossibleScore, percentage, passed,
    passingScore, submittedAt, startedAt, status, flagged, allowReview, answers = [] } = results;

  const duration      = fmtDuration(startedAt, submittedAt);
  const autoSubmitted = status === 'auto_submitted';
  const totalGraded   = answers.filter(a => a.isGraded).length;
  const totalCorrect  = answers.filter(a => a.isCorrect).length;

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">

        <button onClick={() => navigate('/student')}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-terracotta-500 font-semibold mb-6 transition-colors">
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        {/* Summary */}
        <div className="card mb-6 text-center">
          <h1 className="font-serif text-2xl text-[var(--text)] mb-1">{quizTitle}</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {fmt(submittedAt)}{duration && <> · {duration}</>}
          </p>

          <ScoreCircle percentage={percentage} passed={passed} />

          <div className="flex items-center justify-center gap-2 mt-4 mb-5 flex-wrap">
            {passed
              ? <span className="badge-passed text-sm px-4 py-1.5"><CheckCircle size={14} /> Passed</span>
              : <span className="badge-failed text-sm px-4 py-1.5"><XCircle size={14} /> Failed</span>}
            {autoSubmitted && <span className="badge bg-amber-100 text-amber-700 text-sm px-3 py-1.5"><Clock size={13} /> Auto-submitted</span>}
            {flagged && <span className="badge-flagged text-sm px-3 py-1.5"><AlertTriangle size={13} /> Flagged</span>}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-terracotta-50 rounded-2xl p-3">
              <p className="font-serif text-xl text-[var(--text)]">{totalScore}/{maxPossibleScore}</p>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">Points</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-3">
              <p className="font-serif text-xl text-[var(--text)]">{totalCorrect}/{totalGraded}</p>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">Correct</p>
            </div>
            <div className="bg-violet-50 rounded-2xl p-3">
              <p className="font-serif text-xl text-[var(--text)]">{passingScore}%</p>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">Pass mark</p>
            </div>
          </div>

          <div className={`mt-5 px-4 py-3 rounded-2xl text-sm font-semibold ${passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {passed
              ? percentage >= 90 ? '🎉 Outstanding! Exceptional work.'
                : percentage >= 75 ? '🌟 Great job! You nailed it.'
                : '✓ Well done — you passed!'
              : percentage >= passingScore - 10
                ? '📚 So close! A little more revision and you will get there.'
                : '💪 Keep studying — you can improve on this.'}
          </div>
        </div>

        {/* Answer breakdown — only when tutor has enabled allowReview */}
        {allowReview && answers.length > 0 && answers[0]?.questionText ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-terracotta-500" />
              <h2 className="font-serif text-xl text-[var(--text)]">Answer Breakdown</h2>
              <span className="text-sm text-[var(--text-muted)] font-semibold ml-auto">
                ({answers.length} question{answers.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="space-y-3">
              {answers.map((item, i) => <AnswerCard key={item.questionId || i} item={item} index={i} />)}
            </div>
          </div>
        ) : answers.length > 0 ? (
          <div className="card text-center py-8">
            <BookOpen size={28} className="text-terracotta-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[var(--text)] mb-1">Answer review is not available for this quiz</p>
            <p className="text-xs text-[var(--text-muted)]">Your tutor has not enabled answer review. Only your score is shown.</p>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link to="/student" className="btn-outline flex-1 flex items-center justify-center gap-2">
            <Home size={16} /> Dashboard
          </Link>
          <Link to="/student/join" className="btn-primary flex-1 flex items-center justify-center gap-2">
            <BookOpen size={16} /> Take Another Quiz
          </Link>
        </div>
      </main>
    </div>
  );
}