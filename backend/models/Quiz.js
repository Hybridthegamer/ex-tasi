const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'file_upload'],
    required: true
  },
  text: { type: String, required: true },
  media: { type: String, default: '' },           // Firebase Storage URL
  mediaType: { type: String, default: '' },       // image | audio | video
  options: [String],                              // MCQ options
  correctAnswer: mongoose.Schema.Types.Mixed,     // string | string[] | boolean
  allowMultiple: { type: Boolean, default: false },
  caseSensitive: { type: Boolean, default: false },
  points: { type: Number, default: 1, min: 0 },
  isAutoGraded: { type: Boolean, default: true },
  hint: { type: String, default: '' },
  explanation: { type: String, default: '' },     // Shown after quiz
  order: { type: Number, default: 0 }
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  instructions: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  questions: [questionSchema],
  accessCode: { type: String, uppercase: true, sparse: true },
  deadline: { type: Date },                        // When code expires
  duration: { type: Number },                      // Minutes per student (null = unlimited)
  isLive: { type: Boolean, default: false },
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  showResultsImmediately: { type: Boolean, default: true },
  allowReview: { type: Boolean, default: true },   // Let students review answers after submit
  passingScore: { type: Number, default: 50 },     // percentage
  maxAttempts: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
  totalPoints: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  publishedAt: { type: Date },
  resultsReleasedAt: { type: Date, default: null }
});

quizSchema.pre('save', function (next) {
  this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);