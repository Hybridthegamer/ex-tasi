import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Hash, ArrowRight, AlertCircle, BookOpen,
  Clock, FileQuestion, Award, Shield, CheckCircle
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { quizAPI, submissionAPI } from '../../services/api';

export default function JoinQuiz() {
  const { code: urlCode }       = useParams();
  const [code, setCode]         = useState((urlCode || '').toUpperCase());
  const [preview, setPreview]   = useState(null);
  const [error, setError]       = useState('');
  const [checking, setChecking] = useState(false);
  const [starting, setStarting] = useState(false);
  const inputRef                = useRef(null);
  const navigate                = useNavigate();

  useEffect(() => {
    if (urlCode && urlCode.length === 6) validateCode(urlCode.toUpperCase());
    else inputRef.current?.focus();
  }, []);

  const handleCodeInput = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(val);
    setError('');
    setPreview(null);
  };

  const validateCode = async (c) => {
    const target = (c || code).trim();
    if (target.length !== 6) { setError('Please enter the full 6-character code.'); return; }
    setChecking(true);
    setError('');
    setPreview(null);
    try {
      const data = await quizAPI.validateCode(target);
      setPreview(data);
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setChecking(false);
    }
  };

  const startOrResume = async () => {
    if (!preview) return;
    setStarting(true);
    try {
      const data = await submissionAPI.start(preview.id);
      navigate(`/student/quiz/${data.submissionId}`, {
        state: { questions: data.questions, timeLimit: data.timeLimit, quizInfo: preview }
      });
    } catch (err) {
      setError(err.message || 'Failed to start quiz.');
      setStarting(false);
    }
  };

  const deadlinePassed = preview?.deadline && new Date() > new Date(preview.deadline);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-12 animate-fade-up">

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-terracotta-50 flex items-center justify-center mx-auto mb-4">
            <Hash size={26} className="text-terracotta-500" />
          </div>
          <h1 className="font-serif text-3xl text-[var(--text)] mb-2">Join a Quiz</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Enter the 6-character code your tutor shared with you.
          </p>
        </div>

        {/* Code input */}
        <div className="card mb-5">
          <label className="label">Quiz Access Code</label>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              className="input font-mono text-lg tracking-[0.3em] uppercase text-center font-bold"
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={handleCodeInput}
              onKeyDown={(e) => e.key === 'Enter' && validateCode()}
            />
            <button
              onClick={() => validateCode()}
              disabled={code.length !== 6 || checking}
              className="btn-primary px-5 shrink-0 flex items-center gap-1.5">
              {checking
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <ArrowRight size={18} />}
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center mt-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${
                i < code.length ? 'bg-terracotta-500' : 'bg-terracotta-100'
              }`} />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold px-3 py-2.5 rounded-xl mt-4">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Quiz preview */}
        {preview && !deadlinePassed && (
          <div className="card border-terracotta-200 animate-fade-in">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-terracotta-500 flex items-center justify-center shrink-0">
                <BookOpen size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-xl text-[var(--text)] leading-tight">{preview.title}</h2>
                {preview.description && (
                  <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">{preview.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-terracotta-50 rounded-xl p-3 text-center">
                <FileQuestion size={16} className="text-terracotta-500 mx-auto mb-1" />
                <p className="font-bold text-sm text-[var(--text)]">{preview.questionCount}</p>
                <p className="text-xs text-[var(--text-muted)]">Questions</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-3 text-center">
                <Award size={16} className="text-violet-500 mx-auto mb-1" />
                <p className="font-bold text-sm text-[var(--text)]">{preview.totalPoints} pts</p>
                <p className="text-xs text-[var(--text-muted)]">Total marks</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <Clock size={16} className="text-amber-500 mx-auto mb-1" />
                <p className="font-bold text-sm text-[var(--text)]">
                  {preview.duration ? `${preview.duration} min` : '∞'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Time limit</p>
              </div>
            </div>

            {preview.instructions && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Instructions</p>
                <p className="text-sm text-amber-800 leading-relaxed">{preview.instructions}</p>
              </div>
            )}

            {preview.isLive && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
                <Shield size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">Live proctoring is active</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Your tutor can monitor tab switches, focus loss, and other activity in real time.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-5">
              <CheckCircle size={14} className="text-green-500" />
              <p className="text-sm text-[var(--text-muted)] font-semibold">
                Passing score: <span className="text-[var(--text)]">{preview.passingScore}%</span>
              </p>
            </div>

            <button onClick={startOrResume} disabled={starting}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {starting
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <ArrowRight size={16} />}
              {starting ? 'Starting…' : preview.canResume ? 'Resume Quiz' : 'Start Quiz'}
            </button>

            {preview.canResume && (
              <p className="text-xs text-center text-amber-600 font-semibold mt-2">
                You have an in-progress attempt — your timer is still running.
              </p>
            )}

            <p className="text-xs text-center text-[var(--text-muted)] mt-2">
              Once you start, your timer begins immediately.
            </p>
          </div>
        )}

        {/* Expired */}
        {preview && deadlinePassed && (
          <div className="card border-red-200 text-center py-8 animate-fade-in">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
            <h2 className="font-serif text-xl text-[var(--text)] mb-2">Quiz Expired</h2>
            <p className="text-sm text-[var(--text-muted)]">
              The deadline for <strong>{preview.title}</strong> has passed.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}