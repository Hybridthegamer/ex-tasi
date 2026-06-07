import { useState } from 'react';
import {
  Trash2, Plus, GripVertical, Image, CheckSquare,
  AlignLeft, FileText, Type, Upload, ChevronDown, ChevronUp
} from 'lucide-react';
import { uploadFile } from '../services/upload';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice',    icon: CheckSquare, color: 'bg-blue-50 text-blue-700' },
  { value: 'true_false',      label: 'True / False',       icon: CheckSquare, color: 'bg-purple-50 text-purple-700' },
  { value: 'short_answer',    label: 'Short Answer',       icon: AlignLeft,   color: 'bg-green-50 text-green-700' },
  { value: 'essay',           label: 'Essay',              icon: FileText,    color: 'bg-amber-50 text-amber-700' },
  { value: 'fill_blank',      label: 'Fill in the Blank',  icon: Type,        color: 'bg-pink-50 text-pink-700' },
  { value: 'file_upload',     label: 'File Upload',        icon: Upload,      color: 'bg-orange-50 text-orange-700' },
];

export default function QuestionEditor({ questions, onChange, quizId }) {
  const addQuestion = (type) => {
    const base = {
      id: `q_${Date.now()}`,
      type,
      text: '',
      media: '',
      mediaType: '',
      points: 1,
      isAutoGraded: !['essay', 'file_upload'].includes(type),
      hint: '',
      explanation: '',
      order: questions.length,
    };
    if (type === 'multiple_choice') {
      base.options = ['', '', '', ''];
      base.correctAnswer = '';
      base.allowMultiple = false;
    }
    if (type === 'true_false') {
      base.correctAnswer = 'true';
    }
    if (['short_answer', 'fill_blank'].includes(type)) {
      base.correctAnswer = '';
      base.caseSensitive = false;
    }
    onChange([...questions, base]);
  };

  const updateQuestion = (idx, updates) => {
    const updated = questions.map((q, i) => i === idx ? { ...q, ...updates } : q);
    onChange(updated);
  };

  const removeQuestion = (idx) => {
    onChange(questions.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx, dir) => {
    const arr = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr.map((q, i) => ({ ...q, order: i })));
  };

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <QuestionCard
          key={q.id || idx}
          question={q}
          index={idx}
          total={questions.length}
          onUpdate={(updates) => updateQuestion(idx, updates)}
          onRemove={() => removeQuestion(idx)}
          onMove={(dir) => moveQuestion(idx, dir)}
          quizId={quizId}
        />
      ))}

      <div className="bg-white rounded-3xl border-2 border-dashed border-terracotta-200 p-6">
        <p className="text-center text-sm font-bold text-[var(--text-muted)] mb-4">
          Add a Question
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUESTION_TYPES.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => addQuestion(value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${color} hover:opacity-80 transition-all active:scale-95`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ question, index, total, onUpdate, onRemove, onMove, quizId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const typeInfo = QUESTION_TYPES.find((t) => t.value === question.type);

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url, mediaType } = await uploadFile(
        file,
        `quiz-media/${quizId || 'draft'}/`,
        (p) => setUploadProgress(p)
      );
      onUpdate({ media: url, mediaType });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Media upload failed. Check Firebase config.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const updateOption = (optIdx, val) => {
    const opts = [...question.options];
    opts[optIdx] = val;
    onUpdate({ options: opts });
  };

  const addOption = () => onUpdate({ options: [...(question.options || []), ''] });

  const removeOption = (optIdx) => {
    const opts = question.options.filter((_, i) => i !== optIdx);
    onUpdate({ options: opts });
  };

  return (
    <div className="bg-white rounded-3xl border border-terracotta-100 shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-terracotta-50 border-b border-terracotta-100">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
            className="text-[var(--text-muted)] hover:text-terracotta-500 disabled:opacity-20 leading-none">
            <ChevronUp size={14} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1}
            className="text-[var(--text-muted)] hover:text-terracotta-500 disabled:opacity-20 leading-none">
            <ChevronDown size={14} />
          </button>
        </div>

        <span className="w-7 h-7 rounded-full bg-terracotta-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        <span className={`badge text-xs ${typeInfo?.color}`}>
          {typeInfo?.label}
        </span>

        <div className="flex-1 truncate">
          <span className="text-sm font-semibold text-[var(--text-muted)] truncate">
            {question.text || <em>No question text</em>}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setCollapsed(!collapsed)}
            className="text-[var(--text-muted)] hover:text-terracotta-500 transition p-1">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button type="button" onClick={onRemove}
            className="text-[var(--text-muted)] hover:text-red-500 transition p-1">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Question *</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Type your question here…"
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Attach Media (optional)</label>
            {question.media ? (
              <div className="relative rounded-xl overflow-hidden border border-terracotta-100">
                {question.mediaType === 'image' && (
                  <img src={question.media} alt="Question media" className="max-h-48 w-full object-cover" />
                )}
                {question.mediaType === 'video' && (
                  <video src={question.media} controls className="max-h-48 w-full" />
                )}
                {question.mediaType === 'audio' && (
                  <audio src={question.media} controls className="w-full p-2" />
                )}
                <button type="button"
                  onClick={() => onUpdate({ media: '', mediaType: '' })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">
                  ×
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-terracotta-200 rounded-xl p-3 hover:bg-terracotta-50 transition">
                <Image size={16} className="text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-muted)]">
                  {uploading ? `Uploading… ${uploadProgress}%` : 'Upload image, video, or audio'}
                </span>
                <input type="file" className="hidden"
                  accept="image/*,video/*,audio/*"
                  onChange={handleMediaUpload}
                  disabled={uploading} />
              </label>
            )}
          </div>

          {/* MCQ */}
          {question.type === 'multiple_choice' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Answer Options *</label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] cursor-pointer">
                  <input type="checkbox" checked={question.allowMultiple || false}
                    onChange={(e) => onUpdate({ allowMultiple: e.target.checked, correctAnswer: e.target.checked ? [] : '' })}
                    className="accent-terracotta-500" />
                  Multiple correct
                </label>
              </div>
              <div className="space-y-2">
                {(question.options || []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    {question.allowMultiple ? (
                      <input type="checkbox"
                        className="accent-terracotta-500 shrink-0"
                        checked={(question.correctAnswer || []).includes(opt)}
                        onChange={(e) => {
                          const prev = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
                          onUpdate({ correctAnswer: e.target.checked ? [...prev, opt] : prev.filter(a => a !== opt) });
                        }} />
                    ) : (
                      <input type="radio"
                        className="accent-terracotta-500 shrink-0"
                        name={`correct_${question.id}`}
                        checked={question.correctAnswer === opt}
                        onChange={() => onUpdate({ correctAnswer: opt })} />
                    )}
                    <input type="text" className="input flex-1 py-2"
                      placeholder={`Option ${oi + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(oi, e.target.value)} />
                    <button type="button" onClick={() => removeOption(oi)}
                      className="text-[var(--text-muted)] hover:text-red-500 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addOption}
                  className="flex items-center gap-1.5 text-sm text-terracotta-500 font-semibold hover:underline">
                  <Plus size={14} /> Add option
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Select the radio/checkbox to mark correct answer(s).
              </p>
            </div>
          )}

          {/* True/False */}
          {question.type === 'true_false' && (
            <div>
              <label className="label">Correct Answer *</label>
              <div className="flex gap-3">
                {['true', 'false'].map((val) => (
                  <button key={val} type="button"
                    onClick={() => onUpdate({ correctAnswer: val })}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                      question.correctAnswer === val
                        ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-700'
                        : 'border-terracotta-100 text-[var(--text-muted)] hover:border-terracotta-300'
                    }`}>
                    {val === 'true' ? '✓ True' : '✗ False'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Short Answer / Fill Blank */}
          {['short_answer', 'fill_blank'].includes(question.type) && (
            <div className="space-y-3">
              <div>
                <label className="label">
                  {question.type === 'fill_blank' ? 'Expected Answer (for auto-grading)' : 'Model Answer (optional)'}
                </label>
                <input type="text" className="input"
                  placeholder={question.type === 'fill_blank' ? 'Exact expected answer' : 'Ideal answer text'}
                  value={question.correctAnswer || ''}
                  onChange={(e) => onUpdate({ correctAnswer: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] cursor-pointer">
                <input type="checkbox" checked={question.caseSensitive || false}
                  onChange={(e) => onUpdate({ caseSensitive: e.target.checked })}
                  className="accent-terracotta-500" />
                Case sensitive matching
              </label>
            </div>
          )}

          {/* Essay / File Upload */}
          {['essay', 'file_upload'].includes(question.type) && (
            <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700 font-semibold">
              {question.type === 'essay'
                ? '📝 Essay answers require manual grading by the tutor.'
                : '📎 Students will upload a file as their response.'}
            </div>
          )}

          {/* Points, Hint, Explanation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-terracotta-50">
            <div>
              <label className="label">Points</label>
              <input type="number" className="input py-2" min={0} max={100}
                value={question.points}
                onChange={(e) => onUpdate({ points: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Hint (optional)</label>
              <input type="text" className="input py-2" placeholder="Hint for students"
                value={question.hint || ''}
                onChange={(e) => onUpdate({ hint: e.target.value })} />
            </div>
            <div>
              <label className="label">Explanation (shown after)</label>
              <input type="text" className="input py-2" placeholder="Why this answer?"
                value={question.explanation || ''}
                onChange={(e) => onUpdate({ explanation: e.target.value })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}