const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { getInstitution, getTutorStats, getStudentStats } = require('../controllers/institutionController');

router.use(auth);
router.get('/', getInstitution);
router.get('/stats/tutor', requireRole('tutor'), getTutorStats);
router.get('/stats/student', requireRole('student'), getStudentStats);

module.exports = router;