const Institution = require('../models/Institution');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');

exports.getInstitution = async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institution)
      .populate('tutors', 'name email createdAt')
      .populate('students', 'name email createdAt');
    if (!institution) return res.status(404).json({ message: 'Institution not found.' });
    res.json(institution);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getTutorStats = async (req, res) => {
  try {
    const tutorId = req.user._id;
    const quizCount = await Quiz.countDocuments({ tutor: tutorId });
    const activeQuizzes = await Quiz.countDocuments({ tutor: tutorId, status: 'active' });
    const draftQuizzes = await Quiz.countDocuments({ tutor: tutorId, status: 'draft' });

    const quizIds = await Quiz.find({ tutor: tutorId }).distinct('_id');
    const submissionCount = await Submission.countDocuments({
      quiz: { $in: quizIds },
      status: { $ne: 'in_progress' }
    });
    const flaggedCount = await Submission.countDocuments({
      quiz: { $in: quizIds },
      flagged: true
    });

    const avgResult = await Submission.aggregate([
      { $match: { quiz: { $in: quizIds }, status: { $in: ['submitted', 'graded', 'auto_submitted'] } } },
      { $group: { _id: null, avg: { $avg: '$percentage' }, passRate: { $avg: { $cond: ['$passed', 1, 0] } } } }
    ]);

    res.json({
      quizCount,
      activeQuizzes,
      draftQuizzes,
      submissionCount,
      flaggedCount,
      avgScore: avgResult[0]?.avg ? Number(avgResult[0].avg.toFixed(1)) : 0,
      passRate: avgResult[0]?.passRate ? Number((avgResult[0].passRate * 100).toFixed(1)) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const studentId = req.user._id;
    const submissions = await Submission.find({
      student: studentId,
      status: { $ne: 'in_progress' }
    }).populate('quiz', 'title passingScore');

    const quizzesTaken = submissions.length;
    const passed = submissions.filter((s) => s.passed).length;
    const avgScore = submissions.length
      ? Number((submissions.reduce((s, sub) => s + sub.percentage, 0) / submissions.length).toFixed(1))
      : 0;
    const bestScore = submissions.length
      ? Math.max(...submissions.map((s) => s.percentage))
      : 0;

    res.json({ quizzesTaken, passed, failed: quizzesTaken - passed, avgScore, bestScore });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};