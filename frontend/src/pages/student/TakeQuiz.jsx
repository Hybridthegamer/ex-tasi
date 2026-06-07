import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AlertTriangle, ChevronLeft, ChevronRight, Send, Upload, CheckCircle } from 'lucide-react';
import Timer from '../../components/Timer';
import { submissionAPI } from '../../services/api';
import { uploadFile } from '../../services/upload';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function MCQOption({ option, selected, multiple, onChange }) {
  return (
    <label className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
      selected ? 'border-terracotta-500 bg-terracotta-50' : 'border-terracotta-100 hover:border-terracotta-200 bg-white'
    }`}>
      <input type={multiple ? 'checkbox' : 'radio'}
        className="accent-terracotta-500 w-4 h-4 shrink-0"
        checked={!!selected} onChange={onChange} />
      <span className={`text-sm font-semibold ${selected ? 'text-terracotta-700' : 'text-[var(--text)]'}`}>{option}</span>
    </label>
  );
}

function FileUploadAnswer({ answer, onAnswer, questionId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]  = useState(0);
  const [error, setError]        = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const { url } = await uploadFile(file, `submissions/${questionId}/`, (p) => setProgress(p));
      onAnswer(url);
    } catch { setError('Upload failed. Please try again.'); }
    finally { setUploading(false); setProgress(0); }
  };

  if (answer) return (
    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
      <CheckCircle size={18} className="text-green-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-green-700">File uploaded</p>
        <a href={answer} target="_blank" rel="noopener noreferrer"
          className="text-xs text-green-600 hover:underline truncate block">{answer}</a>
      </div>
      <button onClick={() => onAnswer('')} className="text-xs text-red-500 font-bold hover:underline shrink-0">Remove</button>
    </div>
  );

  return (
    <div>
      <label className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${
        uploading ? 'border-terracotta-300 bg-terracotta-50' : 'border-terracotta-200 hover:bg-terracotta-50'
      }`}>
        <Upload size={28} className="text-terracotta-400" />
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--text)]">{uploading ? `Uploading… ${progress}%` : 'Click to upload your file'}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Any file type accepted</p>
        </div>
        <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <p className="text-xs text-red-600 font-semibold mt-2">{error}</p>}
    </div>
  );
}

function QuestionBody({ question, answer, onAnswer }) {
  const { type, text, media, mediaType, options, allowMultiple, hint } = question;
  const qid = question.id;

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-[var(--text)] leading-relaxed">{text}</p>

      {media && (
        <div className="rounded-2xl overflow-hidden border border-terracotta-100">
          {mediaType === 'image' && <img src={media} alt="Question" className="max-h-64 w-full object-cover" />}
          {mediaType === 'video' && <video src={media} controls className="w-full max-h-64" />}
          {mediaType === 'audio' && <audio src={media} controls className="w-full p-2" />}
        </div>
      )}

      {hint && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <span className="text-amber-500 text-xs font-extrabold uppercase tracking-wide shrink-0 pt-0.5">Hint</span>
          <p className="text-xs text-amber-800">{hint}</p>
        </div>
      )}

      {type === 'multiple_choice' && (
        <div className="space-y-2">
          {(options || []).map((opt, i) => {
            const selected = allowMultiple
              ? (Array.isArray(answer) ? answer.includes(opt) : false)
              : answer === opt;
            return (
              <MCQOption key={i} option={opt} selected={selected} multiple={allowMultiple}
                onChange={() => {
                  if (allowMultiple) {
                    const prev = Array.isArray(answer) ? answer : [];
                    onAnswer(selected ? prev.filter(a => a !== opt) : [...prev, opt]);
                  } else { onAnswer(opt); }
                }} />
            );
          })}
        </div>
      )}

      {type === 'true_false' && (
        <div className="grid grid-cols-2 gap-3">
          {['true', 'false'].map((val) => (
            <button key={val} type="button" onClick={() => onAnswer(val)}
              className={`py-4 rounded-2xl font-bold text-base border-2 transition-all active:scale-95 ${
                answer === val
                  ? val === 'true' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700'
                  : 'border-terracotta-100 text-[var(--text)] hover:border-terracotta-300'
              }`}>
              {val === 'true' ? '✓ True' : '✗ False'}
            </button>
          ))}
        </div>
      )}

      {type === 'short_answer' && (
        <input type="text" className="input" placeholder="Type your answer…"
          value={answer || ''} onChange={(e) => onAnswer(e.target.value)} />
      )}

      {type === 'fill_blank' && (
        <div>
          <p className="text-xs text-[var(--text-muted)] font-semibold mb-2">Fill in the blank:</p>
          <input type="text" className="input font-semibold"
            placeholder="Enter the missing word or phrase…"
            value={answer || ''} onChange={(e) => onAnswer(e.target.value)} />
        </div>
      )}

      {type === 'essay' && (
        <div>
          <textarea className="input resize-none" rows={8}
            placeholder="Write your response here…"
            value={answer || ''} onChange={(e) => onAnswer(e.target.value)} />
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            {(answer || '').trim().split(/\s+/).filter(Boolean).length} words
          </p>
        </div>
      )}

      {type === 'file_upload' && (
        <FileUploadAnswer answer={answer} onAnswer={onAnswer} questionId={qid} />
      )}
    </div>
  );
}

export default function TakeQuiz() {
  const { submissionId } = useParams();
  const location         = useLocation();
  const navigate         = useNavigate();

  const stateQuestions = location.state?.questions || null;
  const stateTimeLimit = location.state?.timeLimit  || null;
  const quizInfo       = location.state?.quizInfo   || null;

  const [questions]                         = useState(stateQuestions || []);
  const [timeLimit]                         = useState(stateTimeLimit);
  const [quizId]                            = useState(quizInfo?.id || null);
  const [isLive]                            = useState(quizInfo?.isLive || false);
  const [quizTitle]                         = useState(quizInfo?.title || 'Quiz');
  const [answers, setAnswers]               = useState({});
  const [currentIdx, setCurrentIdx]         = useState(0);
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [warningToast, setWarningToast]     = useState('');
  const [sessionLost]                       = useState(!stateQuestions);

  const socketRef  = useRef(null);
  const saveTimers = useRef({});
  const hasJoined  = useRef(false);

  // ── Socket ──
  useEffect(() => {
    if (!quizId || !isLive || submitted || sessionLost) return;
    const token  = localStorage.getItem('exetasi_token');
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (!hasJoined.current) {
        socket.emit('student:join', { quizId, submissionId });
        hasJoined.current = true;
      }
    });
    socket.on('tutor:warning', ({ message }) => {
      setWarningToast(message);
      setTimeout(() => setWarningToast(''), 6000);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [quizId, submissionId, isLive, submitted, sessionLost]);

  // ── Proctoring event logger ──
  const logEvent = useCallback((eventType, details) => {
    if (submitted || sessionLost) return;
    // Live: socket (backend persists + notifies tutor)
    if (isLive && socketRef.current?.connected) {
      socketRef.current.emit('student:activity', { eventType, details });
    } else {
      // Non-live: REST only
      submissionAPI.logProctor(submissionId, { eventType, details }).catch(() => {});
    }
  }, [submissionId, isLive, submitted, sessionLost]);

  // ── Browser event listeners for tab/focus/paste detection ──
  useEffect(() => {
    if (!submissionId || submitted || sessionLost) return;

    // visibilitychange fires when the tab is hidden (switched, minimised, etc.)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logEvent('tab_switch', 'Student switched to another tab or minimised window');
      }
    };

    // blur fires when the browser window loses focus (alt-tab, click elsewhere)
    const onBlur = () => {
      logEvent('focus_loss', 'Browser window lost focus');
    };

    // paste fires on any paste attempt — capture phase to catch all inputs
    const onPaste = () => {
      logEvent('paste_attempt', 'Paste action attempted');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('paste', onPaste, true);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('paste', onPaste, true);
    };
  }, [logEvent, submitted, sessionLost, submissionId]);

  // ── Debounced answer save ──
  const saveAnswer = useCallback((questionId, answer) => {
    clearTimeout(saveTimers.current[questionId]);
    saveTimers.current[questionId] = setTimeout(() => {
      submissionAPI.saveAnswer(submissionId, { questionId, answer }).catch(() => {});
    }, 600);
  }, [submissionId]);

  const handleAnswer = useCallback((questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    saveAnswer(questionId, answer);
  }, [saveAnswer]);

  // ── Submit ──
  const doSubmit = useCallback(async (autoSubmitted = false) => {
    if (submitting || submitted) return;
    setSubmitting(true); setShowConfirm(false);
    try {
      Object.values(saveTimers.current).forEach(clearTimeout);
      await Promise.allSettled(
        Object.entries(answers).map(([qid, ans]) =>
          submissionAPI.saveAnswer(submissionId, { questionId: qid, answer: ans })
        )
      );
      const result = await submissionAPI.submit(submissionId, { autoSubmitted });
      setSubmitted(true);
      if (isLive && socketRef.current?.connected && quizId) {
        socketRef.current.emit('student:submitted', { quizId });
      }
      navigate(`/student/result/${submissionId}`, { state: { results: result.results }, replace: true });
    } catch (err) {
      setSubmitting(false);
      console.error('Submit failed:', err);
    }
  }, [submitting, submitted, answers, submissionId, isLive, quizId, navigate]);

  const handleTimerExpire = useCallback(() => { doSubmit(true); }, [doSubmit]);

  if (sessionLost) return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center py-10">
        <AlertTriangle size={36} className="text-amber-400 mx-auto mb-4" />
        <h2 className="font-serif text-2xl text-[var(--text)] mb-2">Session not found</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Your quiz session was lost (likely a page refresh). Please re-enter your quiz code to resume.
        </p>
        <button onClick={() => navigate('/student/join')} className="btn-primary">Back to Join Quiz</button>
      </div>
    </div>
  );

  if (!questions.length) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-terracotta-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="font-serif text-terracotta-500 text-xl">Ε</span>
        </div>
        <p className="text-[var(--text-muted)] font-semibold">Loading quiz…</p>
      </div>
    </div>
  );

  const question   = questions[currentIdx];
  const questionId = question?.id || question?._id;
  const answer     = answers[questionId];
  const answered   = Object.keys(answers).filter(k => {
    const a = answers[k];
    return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Top bar */}
      <div className="bg-white border-b border-terracotta-100 shadow-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-serif text-base text-[var(--text)] truncate">{quizTitle}</p>
            <p className="text-xs text-[var(--text-muted)]">{answered} / {questions.length} answered</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {timeLimit && <Timer timeLimit={timeLimit} onExpire={handleTimerExpire} />}
            {isLive && (
              <span className="badge bg-red-50 text-red-600 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Warning toast */}
      {warningToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-fade-in">
          <div className="bg-red-600 text-white rounded-2xl px-5 py-3.5 shadow-warm-lg flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Warning from tutor</p>
              <p className="text-sm mt-0.5 opacity-90">{warningToast}</p>
            </div>
            <button onClick={() => setWarningToast('')}
              className="ml-auto text-white/70 hover:text-white text-lg leading-none shrink-0">×</button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* Question grid nav */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {questions.map((q, i) => {
            const qid  = q.id || q._id;
            const a    = answers[qid];
            const done = a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
            return (
              <button key={i} onClick={() => setCurrentIdx(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  i === currentIdx  ? 'bg-terracotta-500 text-white shadow-warm'
                  : done            ? 'bg-green-100 text-green-700 border border-green-200'
                  :                   'bg-white border border-terracotta-100 text-[var(--text-muted)] hover:border-terracotta-300'
                }`}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question card */}
        <div className="card" key={questionId}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-terracotta-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {currentIdx + 1}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-semibold capitalize">
                {question.type?.replace('_', ' ')}
              </span>
            </div>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {question.points} pt{question.points !== 1 ? 's' : ''}
            </span>
          </div>
          <QuestionBody
            question={{ ...question, id: questionId }}
            answer={answer}
            onAnswer={(val) => handleAnswer(questionId, val)}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="btn-outline flex items-center gap-1.5 text-sm disabled:opacity-40">
            <ChevronLeft size={16} /> Previous
          </button>

          {currentIdx < questions.length - 1 ? (
            <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
              className="btn-primary flex items-center gap-1.5 text-sm">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={() => setShowConfirm(true)} disabled={submitting}
              className="btn-primary flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700">
              {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          )}
        </div>

        {currentIdx < questions.length - 1 && (
          <div className="mt-4 text-center">
            <button onClick={() => setShowConfirm(true)}
              className="text-sm text-[var(--text-muted)] font-semibold hover:text-terracotta-500 transition-colors">
              Submit now ({answered}/{questions.length} answered)
            </button>
          </div>
        )}
      </main>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-warm-lg p-6 w-full max-w-sm">
            <h3 className="font-serif text-xl text-[var(--text)] mb-2">Submit Quiz?</h3>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              You have answered <strong>{answered}</strong> of <strong>{questions.length}</strong> questions.
            </p>
            {answered < questions.length && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-semibold">
                  {questions.length - answered} question{questions.length - answered !== 1 ? 's' : ''} unanswered. You cannot change answers after submitting.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-outline flex-1 text-sm">Keep reviewing</button>
              <button onClick={() => doSubmit(false)} disabled={submitting}
                className="flex-1 btn-primary text-sm bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
                {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}