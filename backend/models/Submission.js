const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionType: { type: String },
  answer: mongoose.Schema.Types.Mixed,   // string | string[] | boolean | fileUrl
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  isCorrect: { type: Boolean, default: false },
  isGraded: { type: Boolean, default: false },
  tutorFeedback: { type: String, default: '' }
});

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [answerSchema],
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  timeLimit: { type: Date },             // startedAt + quiz.duration
  totalScore: { type: Number, default: 0 },
  maxPossibleScore: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'graded', 'auto_submitted'],
    default: 'in_progress'
  },
  // Proctoring data
  tabSwitches: { type: Number, default: 0 },
  focusLostCount: { type: Number, default: 0 },
  pasteAttempts: { type: Number, default: 0 },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String, default: '' }
});

module.exports = mongoose.model('Submission', submissionSchema);