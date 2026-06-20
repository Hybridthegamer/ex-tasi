import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, BookOpen, Settings,
  Eye, Rocket, Save, AlertCircle, CheckCircle,
  Clock, Calendar, ToggleLeft, ToggleRight
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import QuestionEditor from '../../components/QuestionEditor';
import { quizAPI } from '../../services/api';

const STEPS = [
  { id: 1, label: 'Details',   icon: BookOpen  },
  { id: 2, label: 'Questions', icon: Eye       },
  { id: 3, label: 'Settings',  icon: Settings  },
  { id: 4, label: 'Publish',   icon: Rocket    },
];

const Toggle = ({ checked, onChange, label, sub }) => (
  <label className="flex items-center justify-between cursor-pointer py-3 border-b border-terracotta-50 last:border-0">
    <div>
      <p className="text-sm font-bold text-[var(--text)]">{label}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
    <button type="button" onClick={() => onChange(!checked)}
      className={`shrink-0 flex items-center transition-colors ${checked ? 'text-terracotta-500' : 'text-[var(--text-muted)]'}`}>
      {checked ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  </label>
);

export default function CreateQuiz() {
  const { id }   = useParams();
  const isEdit   = !!id;
  const navigate = useNavigate();

  const [step, setStep]       = useState(1);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [quizId, setQuizId]   = useState(id || null);
  const [published, setPublished] = useState(null);
  const [justPublished, setJustPublished] = useState(false);

  const [details, setDetails] = useState({ title: '', description: '', instructions: '' });
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings]   = useState({
    deadline: '', duration: '',
    isLive: false, shuffleQuestions: false, shuffleOptions: false,
    showResultsImmediately: true, allowReview: true, passingScore: 50
  });

  useEffect(() => {
    if (!isEdit) return;
    quizAPI.getById(id)
      .then(({ quiz }) => {
        setDetails({ title: quiz.title, description: quiz.description || '', instructions: quiz.instructions || '' });
        setQuestions(quiz.questions.map(q => ({ ...q, id: q._id, options: q.options || [], correctAnswer: q.correctAnswer ?? '' })));
        setSettings({
          deadline: quiz.deadline ? new Date(quiz.deadline).toISOString().slice(0, 16) : '',
          duration: quiz.duration || '',
          isLive: quiz.isLive || false,
          shuffleQuestions: quiz.shuffleQuestions || false,
          shuffleOptions: quiz.shuffleOptions || false,
          showResultsImmediately: quiz.showResultsImmediately ?? true,
          allowReview: quiz.allowReview ?? true,
          passingScore: quiz.passingScore ?? 50,
        });
        if (quiz.accessCode) setPublished({ accessCode: quiz.accessCode, status: quiz.status });
      })
      .catch(() => setError('Failed to load quiz.'));
  }, [id, isEdit]);

  const handleDetail  = (e) => setDetails({ ...details, [e.target.name]: e.target.value });
  const handleSetting = (e) => setSettings({ ...settings, [e.target.name]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  const buildPayload = () => ({
    ...details,
    questions,
    ...settings,
    deadline: settings.deadline || undefined,
    duration: settings.duration ? Number(settings.duration) : undefined,
  });

  const saveDraft = async () => {
    if (!details.title.trim()) { setError('Quiz title is required.'); return false; }
    setError('');
    setSaving(true);
    try {
      if (quizId) {
        await quizAPI.update(quizId, buildPayload());
      } else {
        const quiz = await quizAPI.create(buildPayload());
        setQuizId(quiz._id);
      }
      return true;
    } catch (err) {
      setError(err.message || 'Failed to save.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step === 1 && !details.title.trim()) { setError('Quiz title is required.'); return; }
    if (step === 2 && questions.length === 0) { setError('Add at least one question.'); return; }
    setError('');
    setStep(step + 1);
  };

  const back = () => { setError(''); setStep(step - 1); };

  const publish = async () => {
    if (!quizId) { const ok = await saveDraft(); if (!ok) return; }
    setSaving(true);
    setError('');
    try {
      const result = await quizAPI.publish(quizId, { deadline: settings.deadline || undefined });
      setPublished({ accessCode: result.accessCode, status: 'active' });
      setJustPublished(true);
      setSuccess('Quiz published successfully!');
    } catch (err) {
      setError(err.message || 'Failed to publish.');
    } finally {
      setSaving(false);
    }
  };

  const saveAndExit = async () => {
    const ok = await saveDraft();
    if (ok) navigate('/tutor');
  };

  // Persist edits to an already-published quiz without re-publishing it.
  const saveChanges = async () => {
    setSuccess('');
    const ok = await saveDraft();
    if (ok) setSuccess('Changes saved. Students will see the updated quiz.');
  };

  const totalPoints = questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-[var(--text)]">{isEdit ? 'Edit Quiz' : 'New Quiz'}</h1>
            {details.title && <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate max-w-xs">{details.title}</p>}
          </div>
          <button onClick={saveAndExit} disabled={saving}
            className="btn-outline text-sm flex items-center gap-1.5">
            <Save size={14} /> {saving ? 'Saving…' : 'Save & Exit'}
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map(({ id: sid, label, icon: Icon }, idx) => (
            <div key={sid} className="flex items-center flex-1">
              <button onClick={() => sid < step && setStep(sid)} disabled={sid > step}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all w-full justify-center ${
                  sid === step ? 'bg-terracotta-500 text-white shadow-warm'
                  : sid < step ? 'bg-terracotta-50 text-terracotta-600 hover:bg-terracotta-100 cursor-pointer'
                  : 'bg-white text-[var(--text-muted)] border border-terracotta-100 cursor-default'
                }`}>
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{sid}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 w-3 mx-1 rounded-full shrink-0 ${sid < step ? 'bg-terracotta-300' : 'bg-terracotta-100'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-xl mb-5">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-4 py-3 rounded-xl mb-5">
            <CheckCircle size={15} className="shrink-0" /> {success}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="card space-y-5">
            <div>
              <label className="label">Quiz Title *</label>
              <input type="text" name="title" className="input text-base font-semibold"
                placeholder="e.g. Mid-Semester Biology Exam"
                value={details.title} onChange={handleDetail} />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea name="description" className="input resize-none" rows={3}
                placeholder="Brief overview for students"
                value={details.description} onChange={handleDetail} />
            </div>
            <div>
              <label className="label">Student Instructions (optional)</label>
              <textarea name="instructions" className="input resize-none" rows={4}
                placeholder="e.g. Read all questions carefully. No external resources allowed."
                value={details.instructions} onChange={handleDetail} />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--text-muted)] font-semibold">
                {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalPoints} total points
              </p>
            </div>
            <QuestionEditor questions={questions} onChange={setQuestions} quizId={quizId} />
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="card space-y-4">
              <h3 className="font-serif text-lg text-[var(--text)]">Timing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1.5"><Calendar size={13} /> Quiz Deadline</label>
                  <input type="datetime-local" name="deadline" className="input"
                    value={settings.deadline} onChange={handleSetting} />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Code expires after this date/time.</p>
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Clock size={13} /> Time per Student (minutes)</label>
                  <input type="number" name="duration" className="input" min={1} max={480}
                    placeholder="e.g. 30 (blank = no limit)"
                    value={settings.duration} onChange={handleSetting} />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Starts when student begins.</p>
                </div>
              </div>
            </div>

            <div className="card space-y-1">
              <h3 className="font-serif text-lg text-[var(--text)] mb-3">Behaviour</h3>
              <Toggle checked={settings.isLive} onChange={(v) => setSettings({ ...settings, isLive: v })}
                label="Live Proctoring" sub="Monitor student activity in real time" />
              <Toggle checked={settings.shuffleQuestions} onChange={(v) => setSettings({ ...settings, shuffleQuestions: v })}
                label="Shuffle Questions" sub="Each student sees questions in a random order" />
              <Toggle checked={settings.shuffleOptions} onChange={(v) => setSettings({ ...settings, shuffleOptions: v })}
                label="Shuffle MCQ Options" sub="Randomise answer options for multiple choice questions" />
              <Toggle checked={settings.showResultsImmediately} onChange={(v) => setSettings({ ...settings, showResultsImmediately: v })}
                label="Show Results Immediately" sub="Students see score and answers right after submitting" />
              <Toggle checked={settings.allowReview} onChange={(v) => setSettings({ ...settings, allowReview: v })}
                label="Allow Answer Review" sub="Students can review correct answers after submission" />
            </div>

            <div className="card">
              <h3 className="font-serif text-lg text-[var(--text)] mb-4">Grading</h3>
              <label className="label">Passing Score (%)</label>
              <div className="flex items-center gap-4">
                <input type="range" min={0} max={100} step={5} className="flex-1 accent-terracotta-500"
                  value={settings.passingScore}
                  onChange={(e) => setSettings({ ...settings, passingScore: Number(e.target.value) })} />
                <span className="w-14 text-center font-bold text-terracotta-600 text-lg">{settings.passingScore}%</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">Students scoring below this are marked as failed.</p>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="card">
              <h3 className="font-serif text-xl text-[var(--text)] mb-4">Review Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Title',     value: details.title || '—' },
                  { label: 'Questions', value: `${questions.length} (${totalPoints} pts)` },
                  { label: 'Duration',  value: settings.duration ? `${settings.duration} min per student` : 'No limit' },
                  { label: 'Deadline',  value: settings.deadline ? new Date(settings.deadline).toLocaleString() : 'No deadline' },
                  { label: 'Proctoring', value: settings.isLive ? 'Live monitoring ON' : 'Off' },
                  { label: 'Results',   value: settings.showResultsImmediately ? 'Shown immediately' : 'Hidden until graded' },
                  { label: 'Passing',   value: `${settings.passingScore}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 py-2 border-b border-terracotta-50 last:border-0">
                    <span className="text-xs font-bold text-[var(--text-muted)] w-24 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm font-semibold text-[var(--text)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {justPublished ? (
              <div className="card bg-green-50 border-green-200 text-center">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
                <h3 className="font-serif text-2xl text-[var(--text)] mb-2">Quiz is Live!</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">Share this code with your students:</p>
                <div className="inline-flex items-center gap-3 bg-white border-2 border-green-300 rounded-2xl px-6 py-3 mb-4">
                  <span className="font-mono text-3xl font-extrabold tracking-[0.25em] text-terracotta-600">
                    {published.accessCode}
                  </span>
                </div>
                <div className="flex gap-3 justify-center mt-2">
                  <button onClick={() => navigator.clipboard.writeText(published.accessCode)} className="btn-outline text-sm">
                    Copy Code
                  </button>
                  <button onClick={() => navigate(`/tutor/quiz/${quizId}`)} className="btn-primary text-sm">
                    View Details →
                  </button>
                </div>
              </div>
            ) : published?.accessCode ? (
              <div className="card border-terracotta-200 text-center">
                <Rocket size={32} className="text-terracotta-400 mx-auto mb-3" />
                <h3 className="font-serif text-xl text-[var(--text)] mb-2">This quiz is already published</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Save your edits to update it in place — the access code below stays the same and students
                  will see the changes immediately.
                </p>
                <div className="inline-flex items-center gap-3 bg-terracotta-50 border-2 border-terracotta-200 rounded-2xl px-6 py-3 mb-5">
                  <span className="font-mono text-2xl font-extrabold tracking-[0.25em] text-terracotta-600">
                    {published.accessCode}
                  </span>
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => navigate(`/tutor/quiz/${quizId}`)} className="btn-outline text-sm">
                    View Details →
                  </button>
                  <button onClick={saveChanges} disabled={saving}
                    className="btn-primary text-sm flex items-center gap-2">
                    {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card border-terracotta-200 text-center py-8">
                <Rocket size={32} className="text-terracotta-400 mx-auto mb-3" />
                <h3 className="font-serif text-xl text-[var(--text)] mb-2">Ready to publish?</h3>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  Publishing generates a 6-character access code and makes the quiz available to students.
                </p>
                {questions.length === 0 && (
                  <p className="text-sm text-amber-600 font-semibold mb-4">
                    ⚠️ Add at least one question before publishing.
                  </p>
                )}
                <div className="flex gap-3 justify-center">
                  <button onClick={saveDraft} disabled={saving} className="btn-outline text-sm flex items-center gap-1.5">
                    <Save size={14} /> {saving ? 'Saving…' : 'Save as Draft'}
                  </button>
                  <button onClick={publish} disabled={saving || questions.length === 0}
                    className="btn-primary text-sm flex items-center gap-2">
                    {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Rocket size={14} />}
                    {saving ? 'Publishing…' : 'Publish Quiz'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav buttons */}
        {!justPublished && (
          <div className="flex items-center justify-between mt-6">
            <button onClick={step === 1 ? () => navigate('/tutor') : back}
              className="btn-ghost flex items-center gap-1.5 text-sm">
              <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 4 && (
              <button onClick={next} className="btn-primary flex items-center gap-1.5 text-sm">
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}