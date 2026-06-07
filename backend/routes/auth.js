const authRouter = require('express').Router();
const { register, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', auth, getMe);

module.exports = authRouter;