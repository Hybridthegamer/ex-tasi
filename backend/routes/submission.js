const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  startQuiz, saveAnswer, submitQuiz, getResult,
  getStudentHistory, getQuizSubmissions,
  logProctoringEvent, gradeAnswer
} = require('../controllers/submissionController');

router.use(auth);

// Student
router.post('/start', requireRole('student'), startQuiz);
router.put('/:id/answer', requireRole('student'), saveAnswer);
router.post('/:id/submit', requireRole('student'), submitQuiz);
router.post('/:id/proctor', requireRole('student'), logProctoringEvent);
router.get('/my/history', requireRole('student'), getStudentHistory);

// Shared (student sees own, tutor sees all)
router.get('/:id/result', getResult);

// Tutor
router.get('/quiz/:quizId', requireRole('tutor'), getQuizSubmissions);
router.put('/:id/grade', requireRole('tutor'), gradeAnswer);

module.exports = router;