const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const { generateCode } = require('../utils/codeGenerator');

exports.createQuiz = async (req, res) => {
  try {
    const {
      title, description, instructions, coverImage, questions,
      deadline, duration, isLive, shuffleQuestions, shuffleOptions,
      showResultsImmediately, allowReview, passingScore, maxAttempts
    } = req.body;

    if (!title) return res.status(400).json({ message: 'Quiz title is required.' });

    const quiz = await Quiz.create({
      title, description, instructions, coverImage,
      questions: questions || [],
      deadline, duration, isLive,
      shuffleQuestions, shuffleOptions,
      showResultsImmediately, allowReview,
      passingScore: passingScore || 50,
      maxAttempts: maxAttempts || 1,
      tutor: req.user._id,
      institution: req.user.institution
    });

    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Error creating quiz.', error: error.message });
  }
};

exports.getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ tutor: req.user._id })
      .select('title status accessCode deadline duration isLive totalPoints questions createdAt publishedAt')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      quizzes.map(async (quiz) => {
        const submissionCount = await Submission.countDocuments({
          quiz: quiz._id,
          status: { $ne: 'in_progress' }
        });
        const aggResult = await Submission.aggregate([
          { $match: { quiz: quiz._id, status: { $in: ['submitted', 'graded', 'auto_submitted'] } } },
          { $group: { _id: null, avg: { $avg: '$percentage' } } }
        ]);
        return {
          ...quiz.toObject(),
          questionCount: quiz.questions.length,
          submissionCount,
          avgScore: aggResult[0]?.avg ? Number(aggResult[0].avg.toFixed(1)) : 0
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quizzes.', error: error.message });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('tutor', 'name email');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    if (quiz.tutor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this quiz.' });
    }

    const submissions = await Submission.find({ quiz: quiz._id, status: { $ne: 'in_progress' } })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });

    const stats = await Submission.aggregate([
      { $match: { quiz: quiz._id, status: { $in: ['submitted', 'graded', 'auto_submitted'] } } },
      {
        $group: {
          _id: null,
          avgPercentage: { $avg: '$percentage' },
          highestScore: { $max: '$percentage' },
          lowestScore: { $min: '$percentage' },
          passCount: { $sum: { $cond: ['$passed', 1, 0] } }
        }
      }
    ]);

    res.json({ quiz, submissions, stats: stats[0] || {} });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, tutor: req.user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    // A published (active) quiz may still be edited, but only while no student
    // has taken it yet. Once submissions exist, editing the questions would
    // corrupt results that have already been recorded — so it's locked.
    if (quiz.status === 'active') {
      const submissionCount = await Submission.countDocuments({ quiz: quiz._id });
      if (submissionCount > 0) {
        return res.status(400).json({
          message: 'Cannot edit a published quiz once students have started or submitted it. Close it first.'
        });
      }
    }

    const allowed = [
      'title','description','instructions','coverImage','questions','deadline',
      'duration','isLive','shuffleQuestions','shuffleOptions',
      'showResultsImmediately','allowReview','passingScore','maxAttempts'
    ];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) quiz[field] = req.body[field];
    });

    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.publishQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, tutor: req.user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    if (quiz.questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must have at least one question before publishing.' });
    }

    // Generate unique access code
    let code, attempts = 0;
    do {
      code = generateCode(6);
      const clash = await Quiz.findOne({ accessCode: code });
      if (!clash) break;
      attempts++;
    } while (attempts < 20);

    if (req.body.deadline) quiz.deadline = req.body.deadline;
    quiz.accessCode = code;
    quiz.status = 'active';
    quiz.publishedAt = new Date();
    await quiz.save();

    res.json({ quiz, accessCode: code });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.closeQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, tutor: req.user._id },
      { status: 'closed' },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, tutor: req.user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    await Submission.deleteMany({ quiz: req.params.id });
    res.json({ message: 'Quiz and all submissions deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.validateCode = async (req, res) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const quiz = await Quiz.findOne({ accessCode: code, status: 'active' });

    if (!quiz) return res.status(404).json({ message: 'Invalid or expired quiz code.' });

    if (quiz.deadline && new Date() > new Date(quiz.deadline)) {
      return res.status(400).json({ message: 'This quiz has expired. The deadline has passed.' });
    }

    const doneSubmission = await Submission.findOne({
      student: req.user._id,
      quiz: quiz._id,
      status: { $in: ['submitted', 'graded', 'auto_submitted'] }
    });
    if (doneSubmission) {
      return res.status(400).json({
        message: 'You have already completed this quiz.',
        submissionId: doneSubmission._id
      });
    }

    const inProgress = await Submission.findOne({
      student: req.user._id,
      quiz: quiz._id,
      status: 'in_progress'
    });

    res.json({
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      instructions: quiz.instructions,
      duration: quiz.duration,
      totalPoints: quiz.totalPoints,
      questionCount: quiz.questions.length,
      isLive: quiz.isLive,
      deadline: quiz.deadline,
      passingScore: quiz.passingScore,
      canResume: !!inProgress,
      submissionId: inProgress?._id || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

exports.getProctoringData = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, tutor: req.user._id });
    if (!quiz) return res.status(403).json({ message: 'Access denied.' });

    const ProctorEvent = require('../models/ProctorEvent');
    const events = await ProctorEvent.find({ quiz: req.params.id })
      .populate('student', 'name email')
      .sort({ lastSeen: -1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};