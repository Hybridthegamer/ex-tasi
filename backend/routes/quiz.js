const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  createQuiz, getMyQuizzes, getQuizById, updateQuiz,
  publishQuiz, closeQuiz, deleteQuiz, validateCode, getProctoringData
} = require('../controllers/quizController');

router.use(auth);

// Tutor routes
router.post('/', requireRole('tutor'), createQuiz);
router.get('/', requireRole('tutor'), getMyQuizzes);
router.get('/:id', requireRole('tutor'), getQuizById);
router.put('/:id', requireRole('tutor'), updateQuiz);
router.post('/:id/publish', requireRole('tutor'), publishQuiz);
router.post('/:id/close', requireRole('tutor'), closeQuiz);
router.delete('/:id', requireRole('tutor'), deleteQuiz);
router.get('/:id/proctoring', requireRole('tutor'), getProctoringData);

// Student route
router.get('/validate/:code', requireRole('student'), validateCode);

module.exports = router;